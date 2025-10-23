require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.json());

// Static files (zakładam, że serwujesz folder frontend jako root)
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

// Supabase admin client (service_role)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Admin endpoint do zatwierdzania użytkowników
// body: { user_id: "<uuid>", admin_secret: "..." }
app.post('/admin/approve', async (req, res) => {
  const { user_id, admin_secret } = req.body;
  if(!admin_secret || admin_secret !== process.env.ADMIN_SECRET){
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if(!user_id) return res.status(400).json({ error: 'user_id required' });

  try {
    const { data, error } = await supabaseAdmin.from('profiles').update({ approved: true }).eq('id', user_id).select().single();
    if(error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, profile: data });
  } catch(e){
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
