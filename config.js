// Public Supabase settings. The publishable key is safe to ship in the browser:
// row level security only allows reading the class roster, and sign-ins
// can only be written/read through the toilet_* database functions.
window.SIGNIN_CONFIG = {
  url: "https://fomzenfbdtoqwknqtkzi.supabase.co",
  key: "sb_publishable_ojaJjQ6SKp3s277Yaykpqg_wnjXMit8",
};

window.db = {
  async select(path) {
    const r = await fetch(`${SIGNIN_CONFIG.url}/rest/v1/${path}`, {
      headers: { apikey: SIGNIN_CONFIG.key, Authorization: `Bearer ${SIGNIN_CONFIG.key}` },
    });
    if (!r.ok) throw new Error((await r.json()).message || r.statusText);
    return r.json();
  },
  async rpc(fn, args) {
    const r = await fetch(`${SIGNIN_CONFIG.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SIGNIN_CONFIG.key,
        Authorization: `Bearer ${SIGNIN_CONFIG.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.message || r.statusText);
    return body;
  },
};
