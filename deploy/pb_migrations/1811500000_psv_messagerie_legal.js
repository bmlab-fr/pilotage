/// <reference path="../pb_data/types.d.ts" />

// Mise à jour après les changements de psv.bmlab.fr des 11-12/11/2026
// (CDC PSV v3.199, site 1.1.3 ; demande du propriétaire transmise par la
// session « Audit RGPD du site », CDC Pilotage 0.27) :
// - messagerie du site : tout arrive sur contact@bmlab.fr (Infomaniak), lue
//   dans Outlook et Mail ; Gmail n'est plus utilisé (il ne contenait que des
//   essais) : le ménage trimestriel se fait dans contact@bmlab.fr ;
// - copie déchiffrée des sauvegardes PSV à effacer après chaque contrôle de
//   restauration (politique de confidentialité, art. 9 : 30 jours au plus) ;
// - pages légales finales publiées : attentes à suivre (juriste, station,
//   registre des traitements) ;
// - points de sécurité ouverts (chapitre 23 du CDC PSV) et Turnstile à
//   recontrôler ; premiers vrais clients le 19/12/2026.
// Une étape déjà modifiée par le propriétaire n'est jamais réécrite : on ne
// remplace que les étapes restées telles que la migration 1810700000 les a
// posées. Rien n'est supprimé, sauf ces anciennes étapes Gmail inchangées.
migrate((app) => {
  const jour = (s) => s + " 00:00:00.000Z"
  const etapes = app.findCollectionByNameOrId("etapes")
  const taches = app.findCollectionByNameOrId("taches")

  const domaine = (nom) => {
    try {
      return app.findFirstRecordByFilter("domaines", "nom = {:n}", { n: nom }).id
    } catch (e) {
      return ""
    }
  }
  const tacheCommencant = (debut) => app.findRecordsByFilter("taches", "titre ~ {:t}", "", 10, 0, { t: debut })
    .filter((t) => t.getString("titre").indexOf(debut) === 0 && t.getString("etat") !== "terminee")[0]
  const etapesDe = (t) => app.findRecordsByFilter("etapes", "tache = {:t}", "ordre,created", 200, 0, { t: t.id })
  const ajouterEtape = (t, ordre, texte, commande) => {
    if (etapesDe(t).some((e) => e.getString("texte") === texte)) return
    const r = new Record(etapes)
    r.set("tache", t.id)
    r.set("ordre", ordre)
    r.set("texte", texte)
    r.set("commande", commande || "")
    app.save(r)
  }
  const creerTache = (valeurs, liste) => {
    if (!valeurs.domaine) return
    if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: valeurs.titre }).length) return
    const t = new Record(taches)
    Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
    app.save(t)
    ;(liste || []).forEach((x, i) => ajouterEtape(t, (i + 1) * 10, x[0], x[1]))
  }
  const PSV = domaine("Puy-Saint-Vincent")
  const TOUS = domaine("Tous les projets")
  const BASE = { priorite: "important", souplesse: "souple", tolerance: 7, etat: "active" }

  // 1. Ménage RGPD : de Gmail vers la messagerie contact@bmlab.fr.
  const ANCIENNES = [
    "But : respecter les durées de conservation annoncées par la politique de confidentialité de psv.bmlab.fr (messages de contact : 12 mois). Tous les trimestres.",
    "Ouvrez Gmail (le compte qui reçoit les messages du site) et tapez cette recherche :",
    "Cochez la case en haut de la liste, puis « Sélectionner toutes les conversations correspondant à cette recherche », et supprimez.",
    "Videz la corbeille (Corbeille › « Vider la corbeille maintenant ») : sinon, les messages restent encore 30 jours.",
    "Touchez « Fait » ici, avec en remarque le nombre de messages supprimés.",
  ]
  const NOUVELLES = [
    ["But : respecter la politique de confidentialité de psv.bmlab.fr (art. 8) : les messages du formulaire de contact sont gardés 12 mois au plus. Tous les trimestres. Depuis le 12/11/2026, tous les e-mails du site arrivent sur contact@bmlab.fr (messagerie Infomaniak) ; Gmail n'est plus utilisé (il ne contenait que des essais du site).", ""],
    ["Sur le PC, ouvrez Outlook, compte contact@bmlab.fr (ou Infomaniak Mail dans le navigateur, mail.infomaniak.com). Dans la barre de recherche, choisissez « Toutes les boîtes aux lettres » ou « Tous les dossiers » et tapez le début d'objet des e-mails du site :", "[Site PSV]"],
    ["Triez par date et sélectionnez les messages reçus il y a plus de 12 mois : messages du formulaire de contact et notifications du site qui les reprennent, ainsi que vos réponses envoyées (dossier « Éléments envoyés »). Supprimez-les.", ""],
    ["Videz les éléments supprimés : dans Outlook, clic droit sur « Éléments supprimés » › « Vider le dossier » (dans Infomaniak Mail : Corbeille › Vider). Sinon, les messages restent sur le serveur d'Infomaniak. Rien à faire sur l'iPhone et l'iPad : Mail se met à jour tout seul.", ""],
    ["Touchez « Fait » ici, avec en remarque le nombre de messages supprimés.", ""],
  ]
  const menage = tacheCommencant("Ménage RGPD")
  if (menage) {
    const actuelles = etapesDe(menage)
    const inchangees = actuelles.length === ANCIENNES.length && actuelles.every((e, i) => e.getString("texte") === ANCIENNES[i])
    if (inchangees) actuelles.forEach((e) => app.delete(e))
    // Si le propriétaire a modifié la procédure, la nouvelle est ajoutée après la sienne.
    const depart = inchangees || !actuelles.length ? 0 : actuelles[actuelles.length - 1].getInt("ordre")
    NOUVELLES.forEach((x, i) => ajouterEtape(menage, depart + (i + 1) * 10, x[0], x[1]))
    menage.set("titre", "Ménage RGPD dans la messagerie contact@bmlab.fr (messages du formulaire de plus de 12 mois)")
    menage.set("notes", "Depuis le 12/11/2026 (CDC PSV v3.199), les e-mails du site arrivent sur contact@bmlab.fr (Infomaniak), lue dans Outlook (PC) et Mail (iPhone, iPad). Recherche « [Site PSV] », plus de 12 mois, puis vider les éléments supprimés. Politique de confidentialité, art. 8.")
    app.save(menage)
  }

  // 2. Restauration : effacer la copie déchiffrée de PSV (art. 9 : 30 jours).
  const restauration = tacheCommencant("Test de restauration d'une sauvegarde")
  if (restauration) {
    ajouterEtape(restauration, 75, "Si vous avez déchiffré une sauvegarde de PSV dans C:\\Users\\bmiof\\sauvegardes-psv (méthode du CDC PSV), effacez-la aussi, après CHAQUE contrôle : la politique de confidentialité (art. 9) annonce que les copies ne sont pas gardées plus de 30 jours.", "Remove-Item -Recurse -Force \"$env:USERPROFILE\\sauvegardes-psv\"")
  }

  // 3. Revue de sécurité : 7 sondes, Pièces euro, Turnstile, points ouverts.
  const revue = tacheCommencant("Revue de sécurité trimestrielle")
  if (revue) {
    etapesDe(revue).forEach((e) => {
      const avant = e.getString("texte")
      const apres = avant.replace("UptimeRobot (6 sondes vertes)", "UptimeRobot (7 sondes vertes)")
        .replace("psv, vitrine, immat, courses, pilotage, jardin »", "psv, vitrine, immat, courses, pilotage, jardin, pièces euro »")
      if (apres !== avant) {
        e.set("texte", apres)
        app.save(e)
      }
    })
    ajouterEtape(revue, 65, "Cloudflare Turnstile (contrôlé le 12/11/2026) : dans le tableau de bord Cloudflare › Turnstile, le widget doit être limité aux 2 sites (psv.bmlab.fr et la vitrine), sans pré-autorisation. À recontrôler aussi après chaque changement de la clé secrète.", "")
    ajouterEtape(revue, 66, "Points encore ouverts au 12/11/2026 (chapitre 23 du CDC PSV) : S6 mot de passe superuser, S3/S26 CSP stricte, S20 test de charge, S18/S19/S27 décisions à prendre. Ils ont chacun leur tâche dans le Pilotage : faites le point sur chacun.", "")
  }
  const secrets = tacheCommencant("Renouvellement des secrets")
  if (secrets) {
    const turnstile = etapesDe(secrets).filter((e) => e.getString("texte").indexOf("Clé secrète Cloudflare Turnstile") === 0)[0]
    if (turnstile) ajouterEtape(secrets, turnstile.getInt("ordre") + 5, "Après la nouvelle clé Turnstile : recontrôlez le widget dans Cloudflare › Turnstile (limité aux 2 sites, psv.bmlab.fr et la vitrine, sans pré-autorisation) et envoyez un message d'essai par « Nous contacter » : il doit arriver dans contact@bmlab.fr.", "")
  }

  // 4. Attentes liées aux pages légales publiées le 12/11/2026.
  const juriste = tacheCommencant("Validation des textes RGPD par le juriste")
  if (juriste) {
    juriste.set("titre", "Validation a posteriori des pages légales de PSV par le juriste")
    juriste.set("etat", "attente")
    juriste.set("attente_quoi", "Avis du juriste sur les pages légales publiées le 12/11/2026 en 8 langues (mentions légales et politique de confidentialité). Dossier préparé dans le projet PSV.")
    // Le dossier vient d'être envoyé : relance au plus tôt le 30/11/2026.
    if (juriste.getString("attente_relance").slice(0, 10) < "2026-11-30") juriste.set("attente_relance", jour("2026-11-30"))
    juriste.set("notes", "Pages publiées le 12/11/2026 (CDC PSV v3.199). Décisions du propriétaire, à ne pas rediscuter : pas de numéro de téléphone dans les mentions légales ; les 17 notices de fabricants restent hébergées (retrait sur simple demande de l'ayant droit). Dossier pour le juriste : https://claude.ai/artifact/LwocBEwjP35gzQ4gegniXc")
    app.save(juriste)
  }
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "Accord de la station de Puy-Saint-Vincent pour reprendre l'état du domaine skiable", priorite: "confort",
    mode: "unique", etat: "attente", attente_quoi: "Réponse de la station de Puy-Saint-Vincent : accord pour afficher sur le site l'état du domaine skiable.",
    attente_relance: jour("2026-11-30"),
  }))
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "Registre des traitements RGPD (art. 30), selon l'avis du juriste", priorite: "confort",
    mode: "unique", etat: "attente", attente_quoi: "Avis du juriste (tâche « Validation a posteriori des pages légales ») : faut-il tenir un registre, et sous quelle forme.",
    attente_relance: jour("2026-12-15"),
  }))

  // 5. Points de sécurité ouverts (chapitre 23 du CDC PSV).
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "S6 : mot de passe superuser de PSV long, unique, dans le gestionnaire", priorite: "critique",
    mode: "unique", echeance: jour("2026-11-30"),
    notes: "Chapitre 23 du CDC PSV, point S6, « à vérifier ». À faire par le propriétaire avant les premiers clients (19/12/2026) : console d'administration › en haut à droite › mot de passe. Le mot de passe ne s'écrit jamais dans une fiche.",
  }))
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "S3/S26 : CSP stricte sur psv.bmlab.fr (sans 'unsafe-inline')", priorite: "confort",
    mode: "unique", echeance: jour("2027-02-15"), tolerance: 30,
    notes: "Chapitre 23 du CDC PSV : S3 en cours, S26 prévu après le lancement (gros chantier : sortir le JavaScript en ligne des pages). À faire avec Claude dans une session du projet PSV.",
  }))
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "S18/S19/S27 : décisions de sécurité (HSTS preload, proxy Cloudflare, IPv6)", priorite: "confort",
    mode: "unique", etat: "attente", attente_quoi: "Décision du propriétaire sur S18 (HSTS preload), S19 (proxy Cloudflare devant le domaine) et S27 (fiabiliser l'IPv6 de la box ou retirer l'AAAA), chapitre 23 du CDC PSV.",
    attente_relance: jour("2027-01-15"),
  }))

  // 6. Code de connexion d'admin-plus encore envoyé sur Gmail.
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "Décider : code de connexion d'admin-plus sur contact@bmlab.fr plutôt que Gmail", priorite: "confort",
    mode: "unique", echeance: jour("2026-12-15"), tolerance: 15,
    notes: "Le code de connexion de la console d'administration de PSV (compte superuser PocketBase) arrive encore sur Gmail, seul usage restant de Gmail pour le site. Si vous voulez le basculer sur contact@bmlab.fr, demandez-le à Claude dans une session du projet PSV.",
  }))

  // 7. Premiers vrais clients le 19/12/2026.
  creerTache(Object.assign({}, BASE, {
    domaine: PSV, titre: "Premiers vrais clients sur psv.bmlab.fr (19/12/2026) : vérification la veille", priorite: "critique",
    mode: "unique", echeance: jour("2026-12-18"), souplesse: "imperative", tolerance: 0, rappel_jours: 7,
    notes: "Site en production en version 1.1.3 depuis le 12/11/2026. Premiers vrais clients à partir du 19/12/2026.",
  }), [
    ["UptimeRobot : les 7 sondes au vert. Accueil du Pilotage : « Cette nuit » tout vert (sites, certificats, sauvegardes).", ""],
    ["Envoyez un message d'essai par « Nous contacter » sur psv.bmlab.fr : il doit arriver dans contact@bmlab.fr (Outlook) avec l'accusé de réception côté expéditeur.", ""],
    ["Vérifiez que S6 (mot de passe superuser) est fait et que la dernière sauvegarde de PSV date de la nuit.", ""],
    ["Touchez « Fait » ici, avec en remarque ce qui a été vérifié.", ""],
  ])
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
