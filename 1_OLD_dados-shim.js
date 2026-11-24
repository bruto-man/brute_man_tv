/* Estação HB · camada de dados v2 (TESTE)
   A TV passa a ler UM arquivo (dados/tv.json) e o resto do código continua igual:
   - canais.json  -> canais do tv.json + canais de POSTAGENS montados das postagens
   - chat.txt     -> linhas montadas das postagens marcadas "na sala"
   - anuncios.json / claudinha.json -> dados/anuncios.json e dados/claudinha.json
   Se dados/ não existir, tudo cai nos arquivos antigos da raiz (reserva). */
(function () {
  var orig = window.fetch.bind(window);
  var cache = null;
  var TZ = "America/Sao_Paulo";
  var KSLUG = { "Diário": "diario", "Recado": "recados", "Novidade": "novidades", "Dica": "dicas" };
  var KNAME = { "Diário": "DIÁRIO", "Recado": "RECADOS", "Novidade": "NOVIDADES", "Dica": "DICAS" };
  function parts(iso) {
    var o = {}, f = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    f.formatToParts(new Date(iso)).forEach(function (p) { o[p.type] = p.value; });
    if (o.hour === "24") o.hour = "00";
    return o;
  }
  function stamp(iso) { var p = parts(iso); return p.day + "/" + p.month + "/" + p.year + " " + p.hour + ":" + p.minute; }
  function line(p) {
    var t = (p.title ? p.title + " — " : "") + p.text;
    t = t.replace(/\s*\r?\n\s*/g, " ").trim();
    if (p.link) t += " " + p.link;
    return stamp(p.when) + " | " + p.who + " | " + t;
  }
  function chatTxt(posts) {
    var l = posts.filter(function (p) { return p.tv && p.when; }).sort(function (a, b) { return new Date(a.when) - new Date(b.when); });
    return l.map(line).join("\n") + (l.length ? "\n" : "");
  }
  function itemOf(p) {
    var it = { label: (p.title || p.text).replace(/\s+/g, " ").slice(0, 60), url: p.link };
    if (p.capa) it.capa = p.capa;
    if (p.text) it.desc = p.text;
    it.data = new Date(p.when).toISOString();
    return it;
  }
  function canaisDe(tv) {
    var out = (tv.canais || []).filter(function (c) { return !(c && typeof c.id === "string" && c.id.indexOf("CH_POST_") === 0); });
    var g = {};
    (tv.postagens || []).filter(function (p) { return p.fd && p.link && !p.rascunho; })
      .sort(function (a, b) { return new Date(b.when) - new Date(a.when); })
      .forEach(function (p) { (g[p.kind] = g[p.kind] || []).push(p); });
    Object.keys(g).forEach(function (k) {
      if (!KSLUG[k]) return;
      out.push({ id: "CH_POST_" + KSLUG[k].toUpperCase(), slug: "postagens-" + KSLUG[k], title: KNAME[k], badge: "POSTAGENS", auraScore: "",
        caseStudy: "Postagens " + KNAME[k].toLowerCase() + " do Rodrigo e da Cláudia.", category: "POSTAGENS", videos: g[k].map(itemOf), offers: [], adIds: [] });
    });
    return out;
  }
  function tv() {
    if (!cache) cache = orig("dados/tv.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache;
  }
  window.__estacao = { line: line, stamp: stamp, chatTxt: chatTxt, canaisDe: canaisDe, tv: tv, KSLUG: KSLUG, KNAME: KNAME };
  function resp(body, ct) { return new Response(body, { status: 200, headers: { "Content-Type": ct } }); }
  window.fetch = function (u, o) {
    var s = String((u && u.url) || u);
    var m = s.match(/^(?:\.\/)?(canais\.json|chat\.txt|anuncios\.json|claudinha\.json)(\?.*)?$/);
    if (!m) return orig(u, o);
    var nome = m[1];
    if (nome === "anuncios.json" || nome === "claudinha.json") {
      return orig("dados/" + nome + (m[2] || ""), o).then(function (r) { return r.ok ? r : orig(u, o); }).catch(function () { return orig(u, o); });
    }
    return tv().then(function (d) {
      if (!d) return orig(u, o);
      if (nome === "canais.json") return resp(JSON.stringify(canaisDe(d)), "application/json; charset=utf-8");
      return resp(chatTxt(d.postagens || []), "text/plain; charset=utf-8");
    });
  };
})();
