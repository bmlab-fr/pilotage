/// <reference path="../pb_data/types.d.ts" />

// Procédure pas à pas de la vérification des certificats HTTPS des sites
// (demande du propriétaire, 12/11/2026, CDC 0.29), faite ce jour-là avec
// lui : 7 certificats Let's Encrypt valides (chaîne vérifiée), le plus proche
// de sa fin celui d'immat.bmlab.fr (20/12/2026, 37 jours, renouvellement
// attendu vers le 20/11) ; http redirigé vers https (308) partout.
// Tout se fait depuis le PC, comme un visiteur, sans se connecter au serveur.
// Si la tâche a déjà des étapes (par exemple une ancienne liste de 6 sites),
// elles sont gardées et la procédure à jour s'ajoute après ; « 6 sites » dans
// le titre devient « 7 sites ». La tâche est créée si elle n'existe pas.
migrate((app) => {
  const SITES = "'psv.bmlab.fr','hameau-ecrins-405.bmlab.fr','immat.bmlab.fr','courses.bmlab.fr','pilotage.bmlab.fr','jardin.bmlab.fr','pieces-euro.bmlab.fr'"
  const ETAPES = [
    ["But : vérifier que chaque site présente un certificat HTTPS valide (le cadenas du navigateur). Les certificats viennent de Let's Encrypt, durent 90 jours, et Caddy les renouvelle tout seul environ 30 jours avant la fin. Les contrôles de la nuit les vérifient déjà chaque nuit ; ce contrôle à la main confirme, depuis l'extérieur, que tout va bien. Tout se fait sur le PC, sans se connecter au serveur. Durée : 5 minutes.", ""],
    ["Premier coup d'œil : sur l'accueil du Pilotage, ouvrez « Cette nuit ». La ligne « Certificats HTTPS » doit être verte et donner le certificat le plus proche de sa fin.", ""],
    ["Sur le PC, ouvrez PowerShell (menu Démarrer › PowerShell) et collez cette commande. Elle se connecte à chacun des 7 sites et affiche la date de fin de son certificat et le nombre de jours restants.", "" +
      SITES + " | ForEach-Object { $c = New-Object Net.Sockets.TcpClient($_, 443); $s = New-Object Net.Security.SslStream($c.GetStream()); $s.AuthenticateAsClient($_); $x = New-Object Security.Cryptography.X509Certificates.X509Certificate2($s.RemoteCertificate); '{0,-28} fin le {1:dd/MM/yyyy}   reste {2} jours' -f $_, $x.NotAfter, ($x.NotAfter - (Get-Date)).Days; $c.Close() }"],
    ["Lisez le résultat : vous devez voir 7 lignes, une par site. Plus de 30 jours restants : parfait. Entre 20 et 30 jours : normal, le renouvellement va se faire dans les jours qui viennent. Moins de 20 jours, ou un message d'erreur en rouge (« certificat non valide », « impossible de se connecter ») : il y a un problème : voyez l'étape « En cas de problème » plus bas.", ""],
    ["Vérifiez que l'ancienne adresse sans « s » (http://) renvoie bien vers https:// : chaque ligne doit afficher « 308 vers https://… ».", "" +
      SITES + " | ForEach-Object { '{0,-28} {1}' -f $_, (curl.exe -s -o NUL -w \"%{http_code} vers %{redirect_url}\" \"http://$_/\") }"],
    ["Dans le navigateur, ouvrez un ou deux sites : le cadenas doit être fermé, sans avertissement. En cliquant dessus, « La connexion est sécurisée ».", ""],
    ["Si tout est bon, passez directement à la dernière étape (« Fait »).", ""],
    ["En cas de problème : ne touchez à rien sur le serveur et ouvrez une session Claude dans le projet Pilotage, avec la copie du résultat. Les causes habituelles sont Caddy arrêté ou le port 443 fermé sur la Freebox. Rappels : Caddy ne se met jamais à jour par apt (il est bloqué), seulement par « sudo caddy upgrade » ; et l'historique de Caddy (journalctl -u caddy) ne se montre pas sans précaution.", ""],
    ["Touchez « Fait » ici, avec en remarque le site dont le certificat finit le plus tôt et sa date (ex. « 7 certificats valides ; le plus proche : immat.bmlab.fr, 20/12/2026 »).", ""],
  ]

  const etapes = app.findCollectionByNameOrId("etapes")
  const ajouter = (t) => {
    const avant = app.findRecordsByFilter("etapes", "tache = {:t}", "-ordre", 1, 0, { t: t.id })
    const base = avant.length ? avant[0].getInt("ordre") + 100 : 0
    if (avant.length) {
      const r = new Record(etapes)
      r.set("tache", t.id)
      r.set("ordre", base)
      r.set("texte", "Procédure à jour du 12/11/2026 (7 sites, Pièces euro compris) : suivez les étapes ci-dessous ; les précédentes sont gardées pour mémoire.")
      app.save(r)
    }
    if (t.getString("titre").indexOf("6 sites") >= 0) {
      t.set("titre", t.getString("titre").replace("6 sites", "7 sites"))
      app.save(t)
    }
    ETAPES.forEach((x, i) => {
      const r = new Record(etapes)
      r.set("tache", t.id)
      r.set("ordre", base + (i + 1) * 10)
      r.set("texte", x[0])
      r.set("commande", x[1])
      app.save(r)
    })
  }

  // Tâches de vérification des certificats (titre libre, saisi par le
  // propriétaire), sauf les réparations créées par les contrôles de la nuit.
  const trouvees = app.findRecordsByFilter("taches", "titre ~ 'certificat' && titre !~ 'ramon' && etat != 'terminee' && origine = ''", "", 10, 0)
  if (trouvees.length) {
    trouvees.forEach(ajouter)
    return
  }
  let d
  try {
    d = app.findFirstRecordByFilter("domaines", "nom = 'Tous les projets'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: "Vérifier les certificats HTTPS des sites", domaine: d.id, priorite: "important", mode: "apres", intervalle: 3, unite: "mois",
    echeance: "2027-02-12 00:00:00.000Z", derniere_realisation: "2026-11-12 00:00:00.000Z", souplesse: "souple", tolerance: 7, etat: "active",
    notes: "Vérification du 12/11/2026 : 7 certificats valides ; le plus proche de sa fin : immat.bmlab.fr, 20/12/2026 (renouvellement attendu vers le 20/11/2026).",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)
  ajouter(t)
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
