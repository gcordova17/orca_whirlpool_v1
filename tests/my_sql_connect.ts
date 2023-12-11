import { readFile, writeFile } from "mz/fs";
import mysql from 'mysql2';
import { setInterval, clearInterval } from 'timers';

const PATH = "/home/gcordova/dev_env/whirpool_v1/tests/.DB/";



const main = async () => {
    // Read the connection parameters from the file
    const DB_filePath = `${PATH}db_connection.json`;
    const DB_File = await readFile(DB_filePath, {encoding: "utf8",});
    const DB_DataPoint = JSON.parse(DB_File);
    const DB_connection = mysql.createConnection({
        host: DB_DataPoint.host,
        user: DB_DataPoint.user,
        password: DB_DataPoint.password,
        database: DB_DataPoint.database
        });

    // Connect to the database
    DB_connection.connect(error => {
        if (error) throw error;
        console.log("Successfully connected to the database.");
    });

    
    // Read the connection parameters from the file
    
    const axios = require('axios');

    const API_filePath = `${PATH}API_DataConnection.json`;
    const API_File = await readFile(API_filePath, {encoding: "utf8",});
    const API_DataPoint = JSON.parse(API_File);
    

    

    const options = {
        method: 'GET',
        url: `${API_DataPoint.url}market/get-realtime-quotes`,
        params: {sa_ids: '583100'},
        headers: {
            'X-RapidAPI-Key': API_DataPoint.key,
            'X-RapidAPI-Host': API_DataPoint.host
        }
    };

    
        
    try {
	    const response = await axios.request(options);
        //console.log("response:\n", response.data);
        //let data = JSON.parse(response.data);
        //console.log("data:\n", data);
        let quotes = response.data.real_time_quotes;
	    console.log(`${response.data.real_time_quotes[0].last_time} : ${response.data.real_time_quotes[0].last}`);
        // Insert each quote into the MySQL table
        quotes.forEach(quote => {
            DB_connection.query('INSERT INTO real_time_quotes SET ?', quote, (error, results, fields) => {
                if (error) throw error;
        // Success message or handling
            });
        });

    } catch (error) {
	    console.error(error);
    }

    
    // DB_connection.query('SELECT * FROM `portfolio`', (err, rows) => {
    //     if (err) throw err;
    //     console.log('Data received from Db:');
    //     console.log(rows);
    
    // });
    
    // Close the connection
    DB_connection.end();
};

console.log('Starting...');
main();
const intevalId = setInterval(main, 60000);

process.on('SIGINT', () => {
    clearInterval(intevalId);
    console.log('Exiting...');
    process.exit(0);
});