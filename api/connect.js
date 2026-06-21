// Vercel serverless function — an agent self-connects their sub-account to their WFG code (one time).
// POST { locationId, wfgCode, locationName?, email? }  -> upserts a row in the Airtable directory.
// Env: AIRTABLE_TOKEN (a PAT with data.records:read + data.records:write on the base).

const AIRTABLE_BASE = "appOImTsXsTEPWADA";   // "FENIX Mi Organizacion" base
const AIRTABLE_TABLE = "agents";

const up = s => String(s==null?"":s).trim().toUpperCase();
function isCode(s){ const u=up(s); if(!u) return false; if(/\s/.test(u)) return false; return /^[A-Z0-9]{3,8}$/.test(u); }

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method === "OPTIONS") return res.status(200).end();
  if(req.method !== "POST") return res.status(405).json({error:"Usa POST."});
  try{
    let body = req.body;
    if(typeof body === "string"){ try{ body = JSON.parse(body); }catch(e){ body = {}; } }
    body = body || {};

    const locationId   = String(body.locationId||"").trim();
    const wfgCode      = up(body.wfgCode);
    const locationName = String(body.locationName||"").trim();
    const email        = String(body.email||"").trim();

    if(!locationId) return res.status(400).json({error:"Falta la cuenta (locationId)."});
    if(!isCode(wfgCode)) return res.status(400).json({error:"Código inválido. Usa tu código WFG (3-8 letras o números)."});

    const tok = process.env.AIRTABLE_TOKEN;
    if(!tok) return res.status(500).json({error:"Falta AIRTABLE_TOKEN en el servidor."});

    const r = await fetch("https://api.airtable.com/v0/"+AIRTABLE_BASE+"/"+AIRTABLE_TABLE, {
      method: "PATCH",
      headers: { Authorization: "Bearer "+tok, "Content-Type": "application/json" },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ["locationId"] },
        records: [{ fields: { locationId, wfgCode, locationName, email, connectedAt: new Date().toISOString() } }]
      })
    });
    if(!r.ok) return res.status(500).json({error:"No se pudo guardar: "+r.status+" "+(await r.text()).slice(0,150)});
    return res.status(200).json({ ok:true, code: wfgCode });
  }catch(e){ return res.status(500).json({error:String(e.message||e)}); }
};
