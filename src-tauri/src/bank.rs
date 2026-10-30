use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::Path};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct OptionItem {
    pub text: String,
    pub image: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Question {
    pub id: String,
    pub category: String,
    pub text: String,
    pub options: Vec<OptionItem>,
    pub answer: usize,
    pub explanation: String,
}

fn initialize(db: &mut Connection) -> Result<(), String> {
    db.execute_batch("PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY, category TEXT NOT NULL, text TEXT NOT NULL,
            answer INTEGER NOT NULL CHECK(answer BETWEEN 0 AND 3), explanation TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS options (
            question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 3),
            text TEXT NOT NULL, image TEXT NOT NULL,
            PRIMARY KEY(question_id, position)
        );
        CREATE TABLE IF NOT EXISTS bank_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);")
        .map_err(|e| e.to_string())?;
    let seeded: bool = db.query_row("SELECT EXISTS(SELECT 1 FROM bank_meta WHERE key='initialized')", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    if !seeded {
        let mut sample: serde_json::Value = serde_json::from_str(include_str!("../../src/questions.json")).map_err(|e| e.to_string())?;
        for q in sample.as_array_mut().ok_or("Banco de ejemplo inválido")? {
            q["id"] = serde_json::Value::String(q["id"].to_string());
        }
        let questions: Vec<Question> = serde_json::from_value(sample).map_err(|e| e.to_string())?;
        let tx = db.transaction().map_err(|e| e.to_string())?;
        write_questions(&tx, &questions)?;
        tx.execute("INSERT INTO bank_meta(key,value) VALUES('initialized','1')", []).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn open(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    let mut db = Connection::open(path).map_err(|e| e.to_string())?;
    db.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
    initialize(&mut db)?;
    Ok(db)
}

pub fn system_logo(db: &Connection) -> Result<Option<String>, String> {
    db.query_row("SELECT value FROM bank_meta WHERE key='system_logo'", [], |r| r.get(0))
        .optional().map_err(|e| e.to_string())
}

pub fn theme(db: &Connection) -> Result<String, String> {
    Ok(db.query_row("SELECT value FROM bank_meta WHERE key='theme'", [], |r| r.get(0))
        .optional().map_err(|e| e.to_string())?.unwrap_or_else(|| "classic".into()))
}
pub fn save_theme(db: &Connection, theme: &str) -> Result<(), String> {
    if !["classic", "pop"].contains(&theme) { return Err("El tema seleccionado no está disponible.".into()); }
    db.execute("INSERT INTO bank_meta(key,value) VALUES('theme',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [theme]).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn save_system_logo(db: &Connection, image: Option<&str>) -> Result<(), String> {
    if let Some(image) = image {
        let encoded = image.strip_prefix("data:image/png;base64,").ok_or("El logo debe ser una imagen PNG procesada.")?;
        if encoded.len() > 2_800_000 { return Err("El logo supera 2 MB. Elige una imagen más pequeña.".into()); }
        let bytes = STANDARD.decode(encoded).map_err(|_| "El logo contiene datos inválidos.")?;
        if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") { return Err("El logo no es una imagen PNG válida.".into()); }
        db.execute("INSERT INTO bank_meta(key,value) VALUES('system_logo',?1) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [image])
            .map_err(|e| e.to_string())?;
    } else {
        db.execute("DELETE FROM bank_meta WHERE key='system_logo'", []).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn load(db: &Connection) -> Result<Vec<Question>, String> {
    let mut statement = db.prepare("SELECT id,category,text,answer,explanation FROM questions ORDER BY rowid").map_err(|e| e.to_string())?;
    let rows = statement.query_map([], |row| Ok(Question {
        id: row.get(0)?, category: row.get(1)?, text: row.get(2)?, answer: row.get::<_, u32>(3)? as usize, explanation: row.get(4)?, options: Vec::new(),
    })).map_err(|e| e.to_string())?;
    let mut questions = Vec::new();
    for row in rows {
        let mut q = row.map_err(|e| e.to_string())?;
        let mut options = db.prepare("SELECT text,image FROM options WHERE question_id=?1 ORDER BY position").map_err(|e| e.to_string())?;
        q.options = options.query_map([&q.id], |r| Ok(OptionItem { text: r.get(0)?, image: r.get(1)? }))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        questions.push(q);
    }
    Ok(questions)
}

fn write_questions(db: &Connection, questions: &[Question]) -> Result<(), String> {
    for q in questions {
        db.execute("INSERT INTO questions(id,category,text,answer,explanation) VALUES(?1,?2,?3,?4,?5)
            ON CONFLICT(id) DO UPDATE SET category=excluded.category,text=excluded.text,answer=excluded.answer,explanation=excluded.explanation",
            params![q.id,q.category,q.text,q.answer as i64,q.explanation]).map_err(|e| e.to_string())?;
        db.execute("DELETE FROM options WHERE question_id=?1", [&q.id]).map_err(|e| e.to_string())?;
        for (index, option) in q.options.iter().enumerate() {
            db.execute("INSERT INTO options(question_id,position,text,image) VALUES(?1,?2,?3,?4)",
                params![q.id,index as i64,option.text,option.image]).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn validate(questions: &[Question]) -> Result<(), String> {
    if questions.is_empty() || questions.len() > 500 { return Err("Importa entre 1 y 500 preguntas.".into()); }
    let mut ids = HashSet::new();
    let mut total = 0usize;
    for q in questions {
        let bounded = |s: &str, max: usize| !s.trim().is_empty() && s.chars().count() <= max;
        if !bounded(&q.id, 80) || !ids.insert(&q.id) || !bounded(&q.category, 60) || !bounded(&q.text, 180)
            || q.explanation.chars().count() > 300 || !(3..=4).contains(&q.options.len()) || q.answer >= q.options.len() {
            return Err(format!("Pregunta «{}»: identificador, texto, opciones o respuesta inválidos.", q.id));
        }
        for option in &q.options {
            if !bounded(&option.text, 80) { return Err(format!("Pregunta «{}»: texto de opción inválido.", q.id)); }
            let (prefix, encoded) = option.image.split_once(',').ok_or("Imagen inválida")?;
            if !["data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"].contains(&prefix)
                || encoded.len() > 2_800_000 { return Err("Usa imágenes PNG, JPG o WebP de hasta 2 MB procesados.".into()); }
            let bytes = STANDARD.decode(encoded).map_err(|_| "Imagen base64 inválida")?;
            let valid = match prefix {
                "data:image/png;base64" => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
                "data:image/jpeg;base64" => bytes.starts_with(&[0xff,0xd8,0xff]),
                _ => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP".as_slice()),
            };
            if !valid { return Err("El contenido de una imagen no coincide con su formato.".into()); }
            total += option.image.len();
            if total > 64 * 1024 * 1024 { return Err("El lote supera 64 MB. Divídelo en varios archivos CSV.".into()); }
        }
    }
    Ok(())
}

pub fn import(db: &mut Connection, questions: &[Question]) -> Result<(), String> {
    validate(questions)?;
    let tx = db.transaction().map_err(|e| e.to_string())?;
    write_questions(&tx, questions)?;
    tx.commit().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample(id: &str) -> Question {
        Question { id:id.into(), category:"Ciencia".into(), text:"¿Cuál?".into(), answer:0, explanation:"Prueba".into(),
            options:(0..3).map(|i| OptionItem { text:format!("Opción {i}"), image:"data:image/png;base64,iVBORw0KGgo=".into() }).collect() }
    }
    #[test]
    fn insert_update_and_reject_without_partial_writes() {
        let mut db=Connection::open_in_memory().unwrap(); initialize(&mut db).unwrap();
        let original=load(&db).unwrap();
        let q=sample("nueva"); import(&mut db, &[q.clone()]).unwrap();
        assert_eq!(load(&db).unwrap().len(),original.len()+1);
        let mut changed=q.clone(); changed.text="Pregunta actualizada".into(); changed.options.pop();
        assert!(import(&mut db, &[sample("no_guardar"),changed.clone()]).is_err());
        assert_eq!(load(&db).unwrap().last(),Some(&q));
        changed.options.push(q.options[2].clone());
        import(&mut db,&[changed.clone()]).unwrap();
        assert_eq!(load(&db).unwrap().last(),Some(&changed));
        assert_eq!(load(&db).unwrap().len(),original.len()+1);
        assert!(import(&mut db,&[q.clone(),q]).is_err());
    }
    #[test]
    fn disk_persists_images_after_reopening() {
        let path=std::env::temp_dir().join(format!("maraton-bank-test-{}.sqlite",std::process::id()));
        {
            let mut db=open(&path).unwrap(); import(&mut db,&[sample("persistente")]).unwrap();
            assert_eq!(system_logo(&db).unwrap(),None);
            assert_eq!(theme(&db).unwrap(),"classic");
            save_theme(&db,"pop").unwrap();
            save_system_logo(&db,Some(&sample("logo").options[0].image)).unwrap();
        }
        let db=open(&path).unwrap(); assert_eq!(load(&db).unwrap().last(),Some(&sample("persistente")));
        assert_eq!(theme(&db).unwrap(),"pop");
        assert!(save_theme(&db,"unknown").is_err());
        assert_eq!(theme(&db).unwrap(),"pop");
        save_theme(&db,"classic").unwrap(); assert_eq!(theme(&db).unwrap(),"classic");
        let logo=sample("logo").options[0].image.clone();
        assert_eq!(system_logo(&db).unwrap(),Some(logo.clone()));
        assert!(save_system_logo(&db,Some("data:image/png;base64,invalid")).is_err());
        assert_eq!(system_logo(&db).unwrap(),Some(logo));
        save_system_logo(&db,None).unwrap(); assert_eq!(system_logo(&db).unwrap(),None);
        drop(db); std::fs::remove_file(path).unwrap();
    }
    #[test]
    fn sql_failure_rolls_back_the_complete_batch() {
        let mut db=Connection::open_in_memory().unwrap(); initialize(&mut db).unwrap();
        db.execute_batch("CREATE TRIGGER reject_test BEFORE INSERT ON questions WHEN NEW.id='rechazar' BEGIN SELECT RAISE(ABORT,'fallo simulado'); END;").unwrap();
        let before=load(&db).unwrap();
        assert!(import(&mut db,&[sample("primera"),sample("rechazar")]).is_err());
        assert_eq!(load(&db).unwrap(),before);
    }
}
