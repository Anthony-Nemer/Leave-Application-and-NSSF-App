const mysql = require('mysql2');

let db;

function handleDisconnect() {
    db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'nemeranthony2004@',
        database: 'custom_app_db',
        timezone: '+02:00'
    });

    db.connect((err) => {
        if (err) {
            console.error('Error connecting to database:', err);
            setTimeout(handleDisconnect, 2000); // Retry after 2 seconds
        } else {
            console.log('Connected to the database.');
        }
    });

    db.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection lost. Reconnecting...');
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = db;
