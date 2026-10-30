use std::sync::Mutex;
use tauri::Manager;
mod bank;

fn bank_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("preguntas.sqlite"))
}

#[derive(Default)]
struct GameState(Mutex<(serde_json::Value, serde_json::Value)>);

fn require_admin(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() == "main" { Ok(()) } else { Err("Solo el conductor puede modificar la partida.".into()) }
}

#[tauri::command]
async fn get_questions(window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<Vec<bank::Question>, String> {
    require_admin(&window)?;
    bank::load(&bank::open(&bank_path(&app)?)?)
}

#[tauri::command]
async fn get_theme(app: tauri::AppHandle) -> Result<String, String> {
    bank::theme(&bank::open(&bank_path(&app)?)?)
}
#[tauri::command]
async fn set_theme(window: tauri::WebviewWindow, app: tauri::AppHandle, theme: String) -> Result<(), String> {
    require_admin(&window)?;
    bank::save_theme(&bank::open(&bank_path(&app)?)?, &theme)
}

#[tauri::command]
async fn get_system_logo(app: tauri::AppHandle) -> Result<Option<String>, String> {
    bank::system_logo(&bank::open(&bank_path(&app)?)?)
}

#[tauri::command]
async fn set_system_logo(window: tauri::WebviewWindow, app: tauri::AppHandle, image: Option<String>) -> Result<(), String> {
    require_admin(&window)?;
    bank::save_system_logo(&bank::open(&bank_path(&app)?)?, image.as_deref())
}

#[tauri::command]
async fn import_questions(window: tauri::WebviewWindow, app: tauri::AppHandle, questions: Vec<bank::Question>) -> Result<(), String> {
    require_admin(&window)?;
    bank::import(&mut bank::open(&bank_path(&app)?)?, &questions)
}

#[tauri::command]
fn get_game_state(window: tauri::WebviewWindow, state: tauri::State<GameState>) -> Result<serde_json::Value, String> {
    let game = state.0.lock().map_err(|e| e.to_string())?;
    Ok(if window.label() == "main" { game.0.clone() } else { game.1.clone() })
}

#[tauri::command]
fn set_game_state(window: tauri::WebviewWindow, state: tauri::State<GameState>, snapshot: serde_json::Value, display: serde_json::Value) -> Result<(), String> {
    require_admin(&window)?;
    *state.0.lock().map_err(|e| e.to_string())? = (snapshot, display);
    Ok(())
}

#[tauri::command]
async fn open_participants(window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<(), String> {
    require_admin(&window)?;
    if let Some(public) = app.get_webview_window("participants") {
        public.show().map_err(|e| e.to_string())?;
        public.set_focus().map_err(|e| e.to_string())?;
    } else {
        tauri::WebviewWindowBuilder::new(&app, "participants", tauri::WebviewUrl::App("index.html?view=participants".into()))
            .title("Maratón · Participantes").inner_size(1024.0, 720.0).min_inner_size(640.0, 480.0)
            .build().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn participants_fullscreen(window: tauri::WebviewWindow, exit: bool) -> Result<(), String> {
    if window.label() != "participants" { return Err("Esta acción corresponde a la pantalla de participantes.".into()); }
    let fullscreen = !exit && !window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(fullscreen).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(GameState::default())
        .invoke_handler(tauri::generate_handler![get_questions, import_questions, get_theme, set_theme, get_system_logo, set_system_logo, get_game_state, set_game_state, open_participants, participants_fullscreen])
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Maratón del Conocimiento");
}
