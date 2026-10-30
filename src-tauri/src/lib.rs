// El frontend llama a este comando mediante invoke('get_questions').
// include_str! incorpora el banco al ejecutable: no requiere internet.
#[tauri::command]
fn get_questions() -> Result<serde_json::Value, String> {
    serde_json::from_str(include_str!("../../src/questions.json"))
        .map_err(|error| format!("No se pudieron cargar las preguntas: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_questions])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Maratón del Conocimiento");
}
