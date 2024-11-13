const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');

// Inicializando o Express
const app = express();
const port = 3000;

// Configuração do Multer para armazenamento de arquivos
const storage = multer.memoryStorage(); // Armazenar arquivos na memória
const upload = multer({ storage: storage });

// Configuração do PostgreSQL (substitua as credenciais conforme necessário)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'imagem_upload',
  password: 'root',
  port: 5432
});

// Rota para exibir o formulário HTML
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Upload de Imagem</h1>
        <form action="/upload" method="POST" enctype="multipart/form-data">
          <input type="file" name="imagem" accept="image/*" required/>
          <button type="submit">Enviar</button>
        </form>
      </body>
    </html>
  `);
});

// Rota para fazer o upload da imagem
app.post('/upload', upload.single('imagem'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhuma imagem foi enviada.');
  }

  const { originalname, mimetype, buffer } = req.file;

  try {
    // Inserir a imagem no banco de dados
    const result = await pool.query(
      'INSERT INTO imagens (nome, tipo, conteudo) VALUES ($1, $2, $3) RETURNING id;',
      [originalname, mimetype, buffer]
    );
    const imagemId = result.rows[0].id;

    res.send(`
      <h1>Imagem enviada com sucesso!</h1>
      <p>ID da imagem: ${imagemId}</p>
      <p><a href="/">Voltar</a></p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao salvar a imagem.');
  }
});

// Rota para exibir a imagem
app.get('/imagem/:id', async (req, res) => {
  const imagemId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM imagens WHERE id = $1;', [imagemId]);
    const imagem = result.rows[0];

    if (!imagem) {
      return res.status(404).send('Imagem não encontrada.');
    }

    res.setHeader('Content-Type', imagem.tipo);
    res.send(imagem.conteudo); // Enviar o conteúdo binário da imagem
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao recuperar a imagem.');
  }
});

// Configuração de conexão com o banco de dados PostgreSQL
async function createDatabase() {
    try {
    //   // Criação do banco de dados se não existir
    //   await pool.query('CREATE DATABASE IF NOT EXISTS imagem_upload');
    //   console.log('Banco de dados criado com sucesso!');
      
      // Conectar-se ao banco de dados recém-criado
      const newPool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'imagem_upload', // Conectar ao banco de dados recém-criado
        password: 'root',
        port: 5432,
      });
  
      // Criação da tabela 'imagens'
      await newPool.query(`
        CREATE TABLE IF NOT EXISTS imagens (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255),
          tipo VARCHAR(50),
          conteudo BYTEA
        );
      `);
      console.log('Tabela criada com sucesso!');
      
      // Fechar a conexão com o banco
      await newPool.end();
    } catch (err) {
      console.error('Erro ao criar banco de dados ou tabela:', err);
    } 
  }
  
  // Executar a criação do banco e da tabela
  createDatabase();

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});