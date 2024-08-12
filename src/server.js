const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = 3001;

app.use(cors({ origin: 'https://flashi.onrender.com/' }));
app.use(express.json());

const mysql = require('mysql2/promise');

async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
}

async function testDatabaseConnection() {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.query('SELECT VERSION() AS version');
    console.log('Database connection successful:', rows[0].version);
  } catch (error) {
    console.error('Failed to connect to the database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
testDatabaseConnection();

app.get('/fetch', async (req, res) => {
  let connection;
  try {
    connection = await createConnection();
    const [rows] = await connection.execute('SELECT * FROM Flashcard');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching items');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.post('/add', async (req, res) => {
  let connection;
  try {
    const { Question_Content, Answer_Content } = req.body;
    connection = await createConnection();
    const sql = 'INSERT INTO Flashcard (Question_Content, Answer_Content) VALUES (?, ?)';
    const [result] = await connection.execute(sql, [Question_Content, Answer_Content]);

    if (result.insertId) {
      res.status(201).json({ message: "Flashcard added successfully" });
    } else {
      res.status(500).json({ error: "Failed to add flashcard" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding flashcard');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.put('/edit/:id', async (req, res) => {
  const { id } = req.params;
  const { Question_Content, Answer_Content } = req.body;
  let connection;

  try {
    connection = await createConnection();
    
    const [existingRows] = await connection.execute('SELECT * FROM Flashcard WHERE ID = ?', [id]);

    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    const existingFlashcard = existingRows[0];
    const updatedQuestionContent = Question_Content || existingFlashcard.Question_Content;
    const updatedAnswerContent = Answer_Content || existingFlashcard.Answer_Content;

    if (!updatedQuestionContent && !updatedAnswerContent) {
      return res.status(400).json({ error: 'Please provide at least a question or an answer.' });
    }

    const sql = `
      UPDATE Flashcard 
      SET Question_Content = ?, Answer_Content = ? 
      WHERE ID = ?
    `;
    const values = [updatedQuestionContent, updatedAnswerContent, id];

    const [result] = await connection.execute(sql, values);

    if (result.affectedRows > 0) {
      res.json({ message: 'Flashcard updated successfully' });
    } else {
      res.status(500).json({ error: 'Failed to update flashcard' });
    }

  } catch (error) {
    console.error('Error editing flashcard:', error);
    res.status(500).send('Error editing flashcard');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.delete('/delete/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await createConnection();
    const sql = 'DELETE FROM Flashcard WHERE ID = ?';
    const [result] = await connection.execute(sql, [id]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Flashcard deleted successfully" });
    } else {
      res.status(404).json({ error: "Flashcard not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting flashcard');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to our application!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
