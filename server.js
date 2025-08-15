require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const hostname = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sostenibilidadgenerativa';
const CONTEXT_PATH = process.env.CONTEXT_PATH || '/sostenibilidadgenerativa';
const ALLOW_CONTINUE_AFTER_GAME_OVER = process.env.ALLOW_CONTINUE_AFTER_GAME_OVER === 'true' || process.env.ALLOW_CONTINUE_AFTER_GAME_OVER === true || false;
const IFRAME_URL = process.env.IFRAME_URL || 'http://localhost:3000/agentes/embed/';
const WEB_PRINCIPAL_URL = process.env.WEB_PRINCIPAL_URL || ''
const rooms = require('./room.json');
const fs = require('fs').promises;



const app = express();

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.WEB_PRINCIPAL_URL = WEB_PRINCIPAL_URL;
  next();
});

// Diccionario de códigos correctos
const codigos = {
  escape_1: ['1310', "P"],
  escape_2: ['3197', "1"],
  escape_3: ['6934', "A"],
  escape_4: ['11829', "4"],
};

// Conexión a MongoDB
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

app.use(CONTEXT_PATH, express.static(path.join(__dirname, 'public')));


// Routes

// Redirigir la raíz al index con EJS
app.get(CONTEXT_PATH, async (req, res) => {
  res.render('index', { rooms, CONTEXT_PATH });
});

app.get(CONTEXT_PATH + '/:room', async (req, res) => {
  const room = req.params.room;
  const { escapp_email } = req.query;
  const cssPath = path.join(__dirname, 'public', 'css', 'iframe.css');
  let newCSSIframe = '';
  try {
      const cssContent = await fs.readFile(cssPath, 'utf-8');
      newCSSIframe = cssContent;
  } catch (err) {
      console.error('Error leyendo el CSS:', err);
  }
  if (!rooms[room]) return res.status(404).send('Sala no encontrada');
  res.render('escape_room', {
    ...rooms[room],
    room,
    allowContinueAfterGameOver: ALLOW_CONTINUE_AFTER_GAME_OVER,
    CONTEXT_PATH,
    IFRAME_URL,
    escapp_email: escapp_email || '',
    newCSSIframe
  });
});

// API 

app.get(CONTEXT_PATH + '/api/completedRooms', async (req, res) => {
  const { escapp_email } = req.query;
  if (!escapp_email) return res.status(400).json({ error: 'Falta escapp_email' });
  let completedRooms = [];
  try {
    const results = await Result.find({ escapp_email, completed: true }).select('room -_id');
    completedRooms = [...new Set(results.map(r => r.room))];
  } catch (err) {
    console.error('Error consultando la base de datos:', err);
    completedRooms = [];
  }
  res.json({ completedRooms });
});

// API para validar códigos
app.post(CONTEXT_PATH + '/api/validate', async (req, res) => {
  const { room, code, escapp_email, assistant_id, thread_id, run_id, remaining_time, remaining_energy } = req.body;
  let completed = false;
  
  if (codigos[room] && codigos[room][0] === code) {
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
    const finalCode = completed ? codigos[room][1] : "";

  res.json({ completed, room, finalCode });
});

// API para validar códigos
app.post(CONTEXT_PATH + '/api/validateAlreadyCompleted', async (req, res) => {
  console.log(req.body)
  const { room, escapp_email } = req.body;
  // Guardar MongoDB
    let completed  = false;
    let finalCode = "";
    try {
      const result = await Result.findOne({
        escapp_email,
        completed: true,
        room
      });
      completed = !!result;
      finalCode = completed ? codigos[room][1] : "";
    } catch (err) {
      console.error('Error consultando en MongoDB:', err);
    }

    res.json({ completed, finalCode });
});


// API para validar códigos
app.post(CONTEXT_PATH + '/api/validateFinalCode', async (req, res) => {
  const { final_code } = req.body;
  console.log("Trying final code:", final_code);
  let completed  = false;
  const finalCodeReal = Object.values(codigos)
    .map(c => c[1])
    .join('');  
  if (final_code.toLowerCase() === finalCodeReal.toLowerCase()) {
      completed = true;
    }

    res.json({ completed });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}${CONTEXT_PATH}`);
}); 