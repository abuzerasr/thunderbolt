use anyhow::Result;
use libsql::{Builder, Connection};
use mozilla_assist_lib::{imap_client, settings::get_settings};

#[tokio::main]
async fn main() -> Result<()> {
    // Create a database connection
    let database = Builder::new_local("data/local.db").build().await?;

    let mut conn = database.connect()?;

    // Get settings from the database
    let settings = get_settings(&mut conn).await?;

    // Handle the Result and Option types
    let messages = imap_client::fetch_inbox_top(&settings, Some(3));
    match messages {
        Ok(msgs) => println!("Number of messages: {}", msgs.len()),
        Err(e) => println!("Error fetching messages: {}", e),
    }

    Ok(())
}
