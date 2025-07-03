require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Diccionario de códigos correctos
const codigos = {
  escape_1: '1310',
  escape_2: '3197',
  escape_3: '6934',
  escape_4: '11829',
};

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));

const ResultSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  escapp_email: String,
  assistant_id: String,
  thread_id: String,
  run_id: String,
  completed: Boolean,
  room: String,
  remaining_time: Number,
  remaining_energy: Number,
  code: String
});
const Result = mongoose.model('Result', ResultSchema);

app.use(express.json());

// Servir archivos estáticos (html, css, js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// API para validar códigos
app.post('/api/validate', async (req, res) => {
  const { room, code, escapp_email, assistant_id, thread_id, run_id, remaining_time, remaining_energy } = req.body;
  let completed = false;
  
  if (codigos[room] && codigos[room] === code) {
    completed = true;
  }
  // Log para control
  console.log(`[VALIDACIÓN] Email: ${escapp_email || 'N/A'} | Room: ${room} | Code: ${code} | Completed: ${completed} | 
    Remaining time: ${remaining_time} | Remaining energy: ${remaining_energy} 
    | Thread id: ${thread_id} | Run id: ${run_id} | Run id: ${run_id}`);

  // Guardar MongoDB
    try {
      await Result.create({
        date: new Date(),   
        escapp_email,
        assistant_id, 
        thread_id, 
        run_id,
        completed,
        room,
        remaining_time,
        remaining_energy,
        code
      });
      console.log('Resultado guardado en MongoDB');
    } catch (err) {
      console.error('Error guardando en MongoDB:', err);
    }

  res.json({ completed, room });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
}); 