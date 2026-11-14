/// <reference path="../pb_data/types.d.ts" />

// Nouveau site Journal (journal.bmlab.fr, projet C:\Dev\journal), installé le
// 14/11/2026 (CDC Pilotage 0.34). Le script des contrôles de la nuit le
// surveille désormais (listes SITES et SAUVEGARDES) ; ici, les procédures qui
// comptent ou citent les sites passent de 7 à 8 :
// 1) vérification des certificats HTTPS : journal.bmlab.fr ajouté aux deux
//    commandes PowerShell, « 7 sites / 7 lignes / 7 certificats » → 8 ;
// 2) revue de sécurité trimestrielle : 8 sondes UptimeRobot, Journal dans la
//    liste des sites ;
// 3) vérification de la veille des premiers clients PSV : 8 sondes ;
// 4) limite de taille des envois par Caddy : Journal dans la liste des projets ;
// 5) tâche ponctuelle : ajouter la sonde UptimeRobot du Journal (compte du
//    propriétaire, rien à faire sur le serveur). Créée une seule fois.
// Seules les étapes qui contiennent encore l'ancien texte sont modifiées : une
// étape déjà réécrite par le propriétaire n'est pas touchée. Rien n'est supprimé.
migrate((app) => {
  const etapesDe = (t) => app.findRecordsByFilter("etapes", "tache = {:t}", "ordre,created", 200, 0, { t: t.id })
  const ouvertes = (filtre, params) => app.findRecordsByFilter("taches", filtre, "", 20, 0, params || {})
    .filter((t) => t.getString("etat") !== "terminee")
  const commencant = (debut) => ouvertes("titre ~ {:t}", { t: debut }).filter((t) => t.getString("titre").indexOf(debut) === 0)
  // remplacements : liste de [ancien, nouveau] appliqués au texte et à la commande
  const corriger = (t, remplacements) => {
    etapesDe(t).forEach((e) => {
      let change = false
      ;["texte", "commande"].forEach((champ) => {
        const avant = e.getString(champ)
        if (avant.indexOf("journal.bmlab.fr") >= 0) return
        let apres = avant
        remplacements.forEach((r) => { apres = apres.split(r[0]).join(r[1]) })
        if (apres !== avant) {
          e.set(champ, apres)
          change = true
        }
      })
      if (change) app.save(e)
    })
  }

  // 1. Certificats HTTPS (même recherche que la migration 1811700000).
  ouvertes("titre ~ 'certificat' && titre !~ 'ramon' && origine = ''").forEach((t) => {
    corriger(t, [
      ["'pieces-euro.bmlab.fr' |", "'pieces-euro.bmlab.fr','journal.bmlab.fr' |"],
      ["chacun des 7 sites", "chacun des 8 sites"],
      ["vous devez voir 7 lignes", "vous devez voir 8 lignes"],
      ["« 7 certificats valides", "« 8 certificats valides"],
    ])
    if (t.getString("titre").indexOf("7 sites") >= 0) {
      t.set("titre", t.getString("titre").replace("7 sites", "8 sites"))
      app.save(t)
    }
  })

  // 2. Revue de sécurité trimestrielle.
  commencant("Revue de sécurité trimestrielle").forEach((t) => corriger(t, [
    ["UptimeRobot (7 sondes vertes)", "UptimeRobot (8 sondes vertes)"],
    ["jardin, pièces euro »", "jardin, pièces euro, journal »"],
  ]))

  // 3. Veille des premiers vrais clients de PSV.
  commencant("Premiers vrais clients sur psv.bmlab.fr").forEach((t) => corriger(t, [
    ["les 7 sondes au vert", "les 8 sondes au vert"],
  ]))

  // 4. Limite de taille des envois par Caddy.
  commencant("Limiter la taille des envois au niveau de Caddy").forEach((t) => corriger(t, [
    ["Courses, Jardin, Pièces euro, Pilotage)", "Courses, Jardin, Pièces euro, Journal, Pilotage)"],
  ]))

  // 5. Sonde UptimeRobot du Journal.
  const TITRE = "Ajouter la sonde UptimeRobot de journal.bmlab.fr"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let domaine
  try {
    domaine = app.findFirstRecordByFilter("domaines", "nom = 'Tous les projets'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: domaine.id, priorite: "important", mode: "unique",
    echeance: "2026-11-21 00:00:00.000Z", souplesse: "souple", tolerance: 7, etat: "active",
    notes: "Le Journal (journal.bmlab.fr) a été installé le 14/11/2026. Les contrôles de la nuit le surveillent déjà (site, certificat, sauvegarde) ; il manque la surveillance externe, qui prévient dans les 5 minutes si le site ne répond plus.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)
  const etapes = app.findCollectionByNameOrId("etapes")
  ;[
    "Ouvrez UptimeRobot (sur le PC ou le téléphone, le compte existant) et connectez-vous.",
    "Touchez « New monitor » (nouvelle sonde) : type « HTTP(s) », adresse https://journal.bmlab.fr/ , nom « Journal », intervalle 5 minutes. Gardez les mêmes réglages d'alerte par e-mail que pour les autres sites.",
    "Enregistrez, puis attendez quelques minutes : la sonde « Journal » doit passer au vert. Vous avez maintenant 8 sondes, toutes vertes.",
    "Touchez « Fait » ici.",
  ].forEach((texte, i) => {
    const r = new Record(etapes)
    r.set("tache", t.id)
    r.set("ordre", (i + 1) * 10)
    r.set("texte", texte)
    r.set("commande", "")
    app.save(r)
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
