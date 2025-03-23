const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();
const port = process.env.PORT || 10000; // Use environment port for cloud hosting

// Middleware
app.use(express.text()); // Parse raw text from Flutter (e.g., "12345,2025-03-22 10:00")
app.use(cors()); // Enable CORS for cross-origin requests
app.use(express.json()); // For JSON requests (e.g., updates)

// SQLite Database Setup
const dbPath = process.env.NODE_ENV === 'production' ? '/data/attendance.db' : './attendance.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create attendance table if it doesn’t exist
db.run(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentId TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    classId TEXT DEFAULT 'CLASS001'
  )
`);

// Helper function to parse incoming data
const parseAttendanceData = (data) => {
  const [studentId, timestamp] = data.split(',');
  return { studentId, timestamp };
};

// POST: Add new attendance record
app.post('/attendance', (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const { studentId, timestamp } = parseAttendanceData(data);
  if (!studentId || !timestamp) {
    return res.status(400).json({ error: 'Missing studentId or timestamp' });
  }

  db.run(
    'INSERT INTO attendance (studentId, timestamp, classId) VALUES (?, ?, ?)',
    [studentId, timestamp, 'CLASS001'], // Replace 'CLASS001' with dynamic classId if needed
    (err) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).json({ error: 'Failed to save attendance' });
      }
      res.status(201).json({ message: 'Attendance recorded', studentId, timestamp });
    }
  );
});

// GET: Retrieve all attendance records
app.get('/attendance', (req, res) => {
  db.all('SELECT * FROM attendance', [], (err, rows) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch attendance' });
    }
    res.json(rows);
  });
});

// GET: Retrieve attendance by studentId or date
app.get('/attendance/search', (req, res) => {
  const { studentId, date } = req.query;
  let query = 'SELECT * FROM attendance WHERE 1=1';
  const params = [];

  if (studentId) {
    query += ' AND studentId = ?';
    params.push(studentId);
  }
  if (date) {
    query += ' AND timestamp LIKE ?';
    params.push(`${date}%`); // Matches records starting with the given date
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error searching data:', err);
      return res.status(500).json({ error: 'Failed to search attendance' });
    }
    res.json(rows);
  });
});

// PUT: Update an attendance record
app.put('/attendance/:id', (req, res) => {
  const { studentId, timestamp, classId } = req.body;
  const id = req.params.id;

  if (!studentId || !timestamp) {
    return res.status(400).json({ error: 'Missing studentId or timestamp' });
  }

  db.run(
    'UPDATE attendance SET studentId = ?, timestamp = ?, classId = ? WHERE id = ?',
    [studentId, timestamp, classId || 'CLASS001', id],
    (err) => {
      if (err) {
        console.error('Error updating data:', err);
        return res.status(500).json({ error: 'Failed to update attendance' });
      }
      res.json({ message: 'Attendance updated', id });
    }
  );
});

// DELETE: Remove an attendance record
app.delete('/attendance/:id', (req, res) => {
  const id = req.params.id;

  db.run('DELETE FROM attendance WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting data:', err);
      return res.status(500).json({ error: 'Failed to delete attendance' });
    }
    res.json({ message: 'Attendance deleted', id });
  });
});

// Start the sever
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
