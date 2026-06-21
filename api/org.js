// Vercel serverless function — ONE agent's organization view, read live from GoHighLevel (free native API).
// Returns ONLY the requested agent's subtree (pilot scoping). Pass ?agent=<WFG_CODE> or ?email=<login email>.
//
// Env vars required on Vercel:
//   GHL_API_TOKEN   = a GoHighLevel Private Integration token (scopes: View Opportunities, View Custom Fields)
//   (LOCATION_ID is hardcoded to MAIN below; change if needed)
//
// Token: GHL → Settings → Private Integrations → Create → enable "View Opportunities" + "View Custom Fields" → copy.

const BASE = "https://services.leadconnectorhq.com";
const LOCATION_ID = "sJ0hdWs52NA4OYKQ3F6m";          // MAIN (Alexander Navarro LLC)
const PB_PIPELINE = "cpl1UI5SIq0n1bJyLcZ2";          // 4. Pending Bussiness
const VERSION = "2021-07-28";
const AIRTABLE_BASE = "appOImTsXsTEPWADA";   // "FENIX Mi Organizacion" base
const AIRTABLE_TABLE = "agents";             // directory: locationId -> wfgCode (agents self-connect)

// GHL login email -> WFG code (fill for pilot agents, lowercase email).
const EMAIL_TO_CODE = {
};

// opportunity custom-field NAMES (as in GHL) -> internal role. Matched case/accent-insensitively.
const FIELD_ROLE = {
  "wfg codigo de agente": "agent",          // recruit's own WFG code (recruiting opp)
  "codigo del agente upline": "uplineCode",
  "nombre del agente upline": "uplineName",
  "codigo del agente principal": "writingAgent",   // PRIMARY writing agent on a policy (56/57 policies)
  "codigo de agente": "writingAgentAlt",           // secondary/legacy writing-agent field (16/57)
  "prima mensual": "primaMensual",
  "target o prima anualizada": "primaAnual",
  "target premium": "primaAnual"                    // contact field (policy form) — annualized premium
};

const STAGE = {
 "4706b08c-c34c-45a6-b709-2f346d5fbcdd":[1,"Nuevo recluta"],"9ed73f7f-3baa-4052-a435-eb03cbf6a72e":[1,"Contactado"],"c3248c0e-640f-4fe3-b2f4-5715b7ce6ef8":[1,"Cita agendada"],"2c5e5c04-cbcf-49b1-934b-edfe98266867":[1,"Registro de curso"],"e0fb6450-6a51-4485-bca0-4955b190057f":[1,"Examen agendado"],"9c92b5d0-d97d-4727-92a5-8f6f978a4160":[1,"Tutora asignada"],"aa3580b7-99d9-468f-91e0-acdee6be9750":[1,"Reprogramar examen"],"01901ff0-b290-44d3-82ab-06727f67e9b3":[1,"Agente en pausa"],"481961a2-7798-4bbc-a7e8-1fc044e3efbb":[1,"Examen aprobado"],"c5beeabe-bfa6-4cd1-8604-138c99155db8":[1,"Pendiente Pago Bonos"],
 "ac3e7a21-afbc-4d92-a487-5c5bc7ca2724":[2,"Estudiante Nuevo"],"cdbe5403-9f60-4838-82f2-45fd0c62c57e":[2,"Se Contactó"],"5af63cc6-6c3f-4f6c-84c3-0ede8f228c3f":[2,"Curso en Proceso"],"0a69f85c-16e3-4483-8e98-9686ab80770f":[2,"Curso Completado"],"32e13976-a83a-4b6c-826c-fc52f09dd7a8":[2,"No Activo"],"bc25736a-b7d8-4e9c-9e94-f95abf578705":[2,"Sin Examen"],"b1d7b399-4f8f-4837-a514-0bb4acb5e770":[2,"Graduado"],"d2c7d40e-9df6-4fc1-bc79-b58b63316c03":[2,"Pendiente Pago Bonos"],
 "37d5cc35-f4e7-4093-bfdb-00d5b5c5e8e4":[3,"Agente nuevo"],"30e65a06-0f1b-4bcd-aaf4-3190788ebe01":[3,"Contactado"],"b5c988d8-f91e-476c-9675-18e0ed562343":[3,"Cita agendada"],"ca360366-8564-4362-af59-686732ff8d2b":[3,"Aplicación de licencia"],"d33f3a46-2f5f-41f6-a034-09917c25185b":[3,"Agent agreement (Launch)"],"484046a9-4d54-4a8d-a6d2-ed79d57680d6":[3,"WFG pasos finales"],"13f65f8e-c1c6-4f0c-9979-39408b03d199":[3,"Pendiente / Otros"],"8a4c723b-7a0c-4826-86b2-4bb308183125":[3,"Completado ✓"],"362832a9-9b6e-4b18-8f38-9bf323232a92":[3,"Pendiente pago Bonos"],
 "fcb1a9a7-3e3c-4630-8087-03c93c257445":[4,"New policy"],"0dd4031c-f685-4236-8f2b-a7d7de06b7a8":[4,"Entrevista médica"],"cc4f5a10-a32d-4ac5-87d7-fed675b26fba":[4,"Requisitos pendientes"],"b0cb4aac-c399-4d53-905f-563021b95d5c":[4,"Quick check exam"],"09ac7577-9f6a-4565-bb27-ed79eb4a3f79":[4,"Medical Records"],"7b2b2056-5441-477a-8b0f-29b9395cdcf4":[4,"UW / Análisis"],"ce70877e-c530-4d01-a672-79ca71374e85":[4,"Approved / Aprobada"],"8e0b77a5-df44-45fc-95b4-c82ae525849c":[4,"Illustration"],"6cb8071f-4255-487a-b9bd-0d60130bfb00":[4,"Pend issue / Emisión"],"075ce7aa-1fa6-469d-94ae-937bc688e6c4":[4,"Requisitos finales"],"3caf12b7-f6f4-41b7-8e02-af2e9bf19de2":[4,"Comisión pendiente"],"52757fb1-2a06-41de-81c9-655f7e64a9fb":[4,"Inforce / Completada ✓"],"33969bb9-f05d-48d3-be1f-1f5a9dd627ba":[4,"Solucionar problema"],"550bba26-257d-4bdf-b377-84b3e7a830c0":[4,"No tomada"],"ec6fd475-e68f-49ff-860f-82f5cbee5895":[4,"Declinada"]
};

const GARBAGE = new Set(["","XXXXX","XXX12","XXXX","00000","0000","000","00","0","PENDING","NA","N/A","NONE","TBD","E","N"]);
const cl = s => (s==null?"":String(s)).trim();
const up = s => cl(s).toUpperCase();
const norm = s => cl(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g," ").trim();
function isCode(s){const u=up(s);if(GARBAGE.has(u))return false;if(/\s/.test(u))return false;if(/^X+\d*$/.test(u))return false;if(/^N\/?A$/.test(u))return false;return /^[A-Z0-9]{3,8}$/.test(u);}
function titleCase(s){s=cl(s);return s?s.toLowerCase().replace(/\b([a-záéíóúñ])/g,m=>m.toUpperCase()):s;}
function cleanName(s){s=cl(s).replace(/\s*\|\|.*$/,"").trim();const m=s.match(/^(.*?)\s*-\s*\1$/i);if(m)s=m[1];if(!s||/^post\s*licens/i.test(s))return"";return s;}
function parseNum(v){ if(v==null)return 0; const n=parseFloat(String(v).replace(/[^0-9.]/g,"")); return isFinite(n)?n:0; }
// annualized premium: prefer the annual field; else parse the monthly field (×12 unless its text says "anual")
function annualFrom(anualVal, mensualVal){ const a=parseNum(anualVal); if(a>0)return a; const ms=String(mensualVal==null?"":mensualVal); const m=parseNum(ms); if(m>0)return /anual|annual|year|a[nñ]o/i.test(ms)?m:m*12; return 0; }

async function ghl(path, params, token){
  token = token || process.env.GHL_API_TOKEN;
  if(!token) throw new Error("Missing GHL_API_TOKEN env var");
  const u = new URL(BASE+path);
  Object.entries(params||{}).forEach(([k,v])=>{ if(v!=null) u.searchParams.set(k,v); });
  const r = await fetch(u.toString(), {headers:{Authorization:"Bearer "+token, Version:VERSION, Accept:"application/json"}});
  if(!r.ok) throw new Error("GHL "+path+" "+r.status+" "+(await r.text()).slice(0,200));
  return r.json();
}

// Agent directory (Airtable): resolve a sub-account locationId -> the agent's WFG code.
// Populated automatically when an agent self-connects (see /api/connect).
async function codeFromLocation(location){
  const tok = process.env.AIRTABLE_TOKEN; if(!tok || !location) return null;
  try{
    const f = encodeURIComponent("{locationId}='"+String(location).replace(/'/g,"")+"'");
    const r = await fetch("https://api.airtable.com/v0/"+AIRTABLE_BASE+"/"+encodeURIComponent(AIRTABLE_TABLE)+"?filterByFormula="+f+"&maxRecords=1", {headers:{Authorization:"Bearer "+tok}});
    if(!r.ok) return null;
    const j = await r.json();
    const rec = j && j.records && j.records[0];
    return rec ? (rec.fields.wfgCode||null) : null;
  }catch(e){ return null; }
}

// fieldId -> role, by matching custom-field NAMES (fetch opportunity + contact models; ids are unique so merging is safe)
async function fieldRoleMap(){
  const map = {};
  for(const model of ["opportunity","contact"]){
    try{
      const j = await ghl("/locations/"+LOCATION_ID+"/customFields", {model});
      const list = j.customFields || j.customField || [];
      list.forEach(f=>{ const role = FIELD_ROLE[norm(f.name)]; if(role) map[f.id]=role; });
    }catch(e){}
  }
  return map;
}
function readCF(opp, roleMap){
  const out = {};
  (opp.customFields||opp.customField||[]).forEach(c=>{
    const role = roleMap[c.id]; if(!role) return;
    let v = (c.fieldValue!=null)?c.fieldValue : (c.fieldValueString!=null)?c.fieldValueString : (c.value!=null)?c.value : "";
    if(Array.isArray(v)) v = v.join(",");
    out[role] = v;
  });
  return out;
}

async function allOpportunities(){
  const out=[]; let startAfter, startAfterId, page=0;
  while(page++ < 30){
    const j = await ghl("/opportunities/search", {location_id:LOCATION_ID, limit:100, startAfter, startAfterId});
    const arr = j.opportunities || [];
    out.push(...arr);
    const meta = j.meta || {};
    if(arr.length < 100 || !(meta.startAfterId || meta.startAfter)) break;
    startAfter = meta.startAfter; startAfterId = meta.startAfterId;
  }
  return out;
}

function buildGraph(opps, roleMap){
  const childrenByUp={}, nameByCode={}, stageByCode={}, pbByAgent={};
  const setName=(c,n)=>{if(!c)return;n=titleCase(n);if(!n)return;const cur=nameByCode[c];if(!cur||n.length>cur.length)nameByCode[c]=n;};
  opps.forEach((o,i)=>{
    const cf = readCF(o, roleMap);
    const stage = o.pipelineStageId || o.stageId;
    const status = (cl(o.status)||"open").toLowerCase();
    const oppName = o.name || "";
    // genealogy (recruiting): agent + upline custom fields
    let aRaw=cl(cf.agent), ucRaw=cl(cf.uplineCode), unRaw=cl(cf.uplineName);
    if(!isCode(ucRaw)&&isCode(unRaw)){const t=ucRaw;ucRaw=unRaw;unRaw=t;}
    const upC=isCode(ucRaw)?up(ucRaw):null, ag=isCode(aRaw)?up(aRaw):null;
    if(upC)setName(upC,unRaw);
    if(ag){setName(ag,cleanName(oppName));stageByCode[ag]=stage;}
    if(upC && !(ag&&ag===upC)){
      (childrenByUp[upC]=childrenByUp[upC]||[]).push({code:ag,name:cleanName(oppName)||"(nombre pendiente)",status,stage,last:o.lastStageChangeAt||o.updatedAt||o.lastStatusChangeAt||null,key:"k"+i});
    }
    // pending business (production)
    if((o.pipelineId||o.pipeline)===PB_PIPELINE){
      const wa = isCode(cf.writingAgent)?up(cf.writingAgent):(isCode(cf.writingAgentAlt)?up(cf.writingAgentAlt):null);
      const annual = annualFrom(cf.primaAnual, cf.primaMensual);
      const cid = o.contactId||(o.contact&&o.contact.id)||null;
      if(wa)(pbByAgent[wa]=pbByAgent[wa]||[]).push({name:cleanName(oppName)||"(póliza)",stage,status,annual,contactId:cid});
    }
  });
  return {childrenByUp,nameByCode,stageByCode,pbByAgent};
}
function descendants(code,childrenByUp,seen){seen=seen||new Set();let out=[];(childrenByUp[code]||[]).forEach(k=>{out.push(k);if(k.code&&!seen.has(k.code)){seen.add(k.code);out=out.concat(descendants(k.code,childrenByUp,seen));}});return out;}

// Premium is captured by the policy form on the CONTACT (fields "Target premium" / "Prima mensual"),
// not on the opportunity. For policies with no annual amount, read it from the linked contact.
// Requires the GHL token to also carry the "View Contacts" scope (else these calls 401 and points stay 0).
async function fillPremiumFromContacts(policies, roleMap){
  const targets = policies.filter(p=>(!p.annual||p.annual<=0)&&p.contactId).slice(0,40);
  for(const p of targets){
    try{
      const j = await ghl("/contacts/"+p.contactId);
      const c = j.contact||j;
      const cf = readCF({customFields:c.customFields||c.customField||[]}, roleMap);
      const annual = annualFrom(cf.primaAnual, cf.primaMensual);
      if(annual>0) p.annual = annual;
    }catch(e){}
  }
}

// --- Appointments: read from the agent's OWN sub-account calendar (per-account token) ---
// CAL_TOKENS env var = JSON map {"<sub-account locationId>":"<pit- calendar token>", ...}
// CAL_TOKENS = JSON map (multi-account). OR simplest pilot path: CAL_TOKEN (raw pit- token) + CAL_LOCATION (sub-account id).
function calMap(){ let m={}; try{ m=JSON.parse(process.env.CAL_TOKENS||"{}"); }catch(e){ m={}; } if(process.env.CAL_TOKEN&&process.env.CAL_LOCATION){ m[process.env.CAL_LOCATION]=process.env.CAL_TOKEN; } return m; }
// Pick which sub-account calendar to read: explicit ?location wins; else, if exactly one token is
// configured (pilot), use it so appointments work without passing ?location in the menu-link URL.
function resolveCalLocation(location){ const m=calMap(); if(location&&m[location])return location; const keys=Object.keys(m); if(!location&&keys.length===1)return keys[0]; return location||null; }
function calTokenFor(location){ const m=calMap(); return m[location]||null; }
async function appointments(location){
  const loc = resolveCalLocation(location);
  const tok = loc ? calTokenFor(loc) : null;
  if(!loc || !tok) return {available:false, list:[]};
  let cals=[];
  try{ const j=await ghl("/calendars/", {locationId:loc}, tok); cals=j.calendars||j.calendar||[]; }catch(e){ return {available:false, list:[], error:String(e.message||e)}; }
  const now=Date.now(), startTime=now-7*86400000, endTime=now+60*86400000;
  const out=[];
  for(const c of cals.slice(0,15)){
    try{
      const j=await ghl("/calendars/events", {locationId:loc, calendarId:c.id, startTime, endTime}, tok);
      (j.events||j.appointments||[]).forEach(e=>out.push({title:e.title||e.appointmentTitle||"(cita)", start:e.startTime||e.startTimeUtc||e.start||null, status:(e.appointmentStatus||e.status||"agendada"), calendar:c.name||""}));
    }catch(e){}
  }
  out.sort((a,b)=> new Date(a.start||0)-new Date(b.start||0));
  return {available:true, list:out.slice(0,50)};
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Cache-Control","s-maxage=300, stale-while-revalidate=900");
  try{
    const url = new URL(req.url, "http://x");
    const location = cl(url.searchParams.get("location")||"");
    let code = up(url.searchParams.get("agent")||"");
    const email = cl(url.searchParams.get("email")||"").toLowerCase();
    if(!isCode(code) && email) code = up(EMAIL_TO_CODE[email]||"");
    if(!isCode(code) && location) code = up(await codeFromLocation(location)||"");
    if(!isCode(code)){
      if(location){ res.setHeader("Cache-Control","no-store"); return res.status(200).json({needConnect:true, location, locationName: cl(url.searchParams.get("name")||"")}); }
      return res.status(400).json({error:"Pasa ?agent=<WFG_CODE>, ?email=<correo>, o ?location=<id> (embebe el menú con ?location={{location.id}})."});
    }

    const roleMap = await fieldRoleMap();
    const opps = await allOpportunities();
    const g = buildGraph(opps, roleMap);

    const all = descendants(code, g.childrenByUp);
    const orgCodes = new Set([code]); all.forEach(d=>{if(d.code)orgCodes.add(d.code);});
    let policies=[]; orgCodes.forEach(c=>{(g.pbByAgent[c]||[]).forEach(p=>policies.push(p));});
    await fillPremiumFromContacts(policies, roleMap);
    const points = policies.reduce((s,p)=>s+p.annual,0);
    const appts = await appointments(cl(url.searchParams.get("location")||""));
    function tree(c, seen){seen=seen||new Set(); return (g.childrenByUp[c]||[]).map(k=>{
      const cs=new Set(seen); if(k.code)cs.add(k.code);
      return {code:k.code,name:k.name,status:k.status,stageName:(STAGE[k.stage]||[0,"—"])[1],phase:(STAGE[k.stage]||[0])[0],last:k.last||null,children:tree(k.code,cs)};
    });}
    res.status(200).json({
      agent:{code, name:g.nameByCode[code]||code},
      directCount:(g.childrenByUp[code]||[]).length,
      downlineCount:all.length,
      pendingBusiness:{count:policies.length, points, policies:policies.map(p=>({name:p.name,stage:(STAGE[p.stage]||[0,"—"])[1],annual:p.annual}))},
      appointments:{available:appts.available, list:appts.list},
      tree: tree(code),
      updatedAt: new Date().toISOString()
    });
  }catch(e){ res.status(500).json({error:String(e.message||e)}); }
};
