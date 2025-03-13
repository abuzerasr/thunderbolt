use anyhow::Result;
use libsql::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AccountsSettings {
    pub hostname: String,
    pub port: u16,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ModelsSettings {
    pub openai_api_key: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Settings {
    pub account: Option<AccountsSettings>,
    pub models: Option<ModelsSettings>,
}

pub async fn get_settings(conn: &mut Connection) -> Result<Settings> {
    // Prepare the query to get the settings with key "main"
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?")
        .await?;

    // Execute the query with "main" as the parameter
    let mut rows = stmt
        .query(vec![libsql::Value::Text("main".to_string())])
        .await?;

    // Create a variable to hold our result
    let result = if let Some(row) = rows.next().await? {
        // Get the value column as a string
        if let Ok(value) = row.get::<String>(0) {
            // The string might be double-escaped JSON, try to unescape it first
            let unescaped_value = if value.starts_with("\"") && value.ends_with("\"") {
                // This handles the case where the JSON is stored as a quoted string
                serde_json::from_str::<String>(&value).unwrap_or_else(|_| value.clone())
            } else {
                value
            };

            // Parse the JSON string into our Settings struct
            serde_json::from_str(&unescaped_value)?
        } else {
            Settings::default()
        }
    } else {
        // If no settings found, return default settings
        Settings::default()
    };

    // Explicitly drop the rows and statement to release any locks
    drop(rows);
    drop(stmt);

    Ok(result)
}
