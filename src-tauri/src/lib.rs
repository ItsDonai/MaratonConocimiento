use std::sync::Mutex;
use tauri::Manager;

#[derive(Default)]
struct GameState(Mutex<(serde_json::Value, serde_json::Value)>);

fn require_admin(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() == "main" { Ok(()) } else { Err("Solo el conductor puede modificar la partida.".into()) }
}

#[tauri::command]
fn get_questions(window: tauri::WebviewWindow) -> Result<serde_json::Value, String> {
    require_admin(&window)?;
    serde_json::from_str(include_str!("../../src/questions.json")).map_err(|e| e.to_string())
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
            .title("Maratón · Participantes").inner_size(1100.0, 850.0).min_inner_size(420.0, 620.0)
            .build().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(GameState::default())
        .invoke_handler(tauri::generate_handler![get_questions, get_game_state, set_game_state, open_participants])
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Maratón del Conocimiento");
}
