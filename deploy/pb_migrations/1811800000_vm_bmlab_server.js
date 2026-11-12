/// <reference path="../pb_data/types.d.ts" />

// Serveur agrandi à 64 Go et VM renommée bmlab-server (12/11/2026, CDC 0.32 ;
// CDC PSV 3.200), demande du propriétaire.
// 1) Procédure « Vérifier la place libre du disque de la Freebox » : le fichier
//    du serveur s'appelle désormais Z:\VMs\bmlab-server.qcow2 (remplacement fait
//    seulement dans les étapes qui citent encore l'ancien nom), et nouvelle
//    étape : la vérification du disque dans Freebox OS ne marche que VM
//    arrêtée et partages coupés (échec du 01/11/2026).
// 2) Tâche ponctuelle : supprimer la copie de secours des fichiers de la VM
//    faite avant le renommage. Créée une seule fois.
migrate((app) => {
  const TITRE_FREEBOX = "Vérifier la place libre du disque de la Freebox"
  const freebox = app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE_FREEBOX })
  if (freebox.length) {
    const t = freebox[0]
    const etapes = app.findRecordsByFilter("etapes", "tache = {:id}", "ordre", 0, 0, { id: t.id })
    etapes.forEach((e) => {
      const texte = e.getString("texte")
      if (texte.indexOf("sommeil-server.qcow2") < 0) return
      e.set("texte", texte.split("sommeil-server.qcow2").join("bmlab-server.qcow2"))
      app.save(e)
    })
    if (!etapes.some((e) => e.getString("texte").indexOf("Vérifier la partition") >= 0)) {
      // Juste avant la dernière étape (« Fait »).
      const derniere = etapes.length ? etapes[etapes.length - 1].getInt("ordre") : 10
      const r = new Record(app.findCollectionByNameOrId("etapes"))
      r.set("tache", t.id)
      r.set("ordre", derniere - 5)
      r.set("texte", "Vérification du disque lui-même (Freebox OS › Paramètres de la Freebox › Disques › « Vérifier la partition ») : seulement si Freebox OS l'affiche « Non vérifié » ou en cas de doute, et jamais quand le serveur tourne. Elle échoue (« Erreur », disque « Inactif » jusqu'au redémarrage de la Freebox) si la VM ou un partage utilise le disque. Ordre : arrêter la VM (ssh bmlab puis sudo poweroff, attendre « Éteint »), décocher « Activer le partage de fichiers » dans Partages Windows et désactiver UPnP AV, lancer la vérification en lecture seule (jamais « Réparer » sans copie des photos), puis tout remettre et rallumer la VM. Résultat attendu : « Sain » (12/11/2026).")
      r.set("commande", "")
      app.save(r)
    }
  }

  const TITRE = "Supprimer la copie de secours de la VM (VMs/copie-sommeil-server-2026-11-12)"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let domaine
  try {
    domaine = app.findFirstRecordByFilter("domaines", "nom = 'Serveur'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: domaine.id, priorite: "confort", mode: "unique", intervalle: 0, unite: "",
    dates_fixes: "", echeance: "2026-11-19 00:00:00.000Z", souplesse: "souple", tolerance: 7, rappel_jours: 0,
    etat: "active",
    notes: "Copie des deux fichiers de la VM faite le 12/11/2026, VM arrêtée, avant de les renommer en " +
      "bmlab-server et d'agrandir le disque à 64 Go (6,4 Go, tailles vérifiées identiques). Elle ne sert " +
      "qu'à revenir en arrière ; inutile après une semaine sans souci.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["Vérifiez d'abord que tout va bien depuis le 12/11 : les 7 sites s'ouvrent et les contrôles de la nuit du Pilotage n'ont signalé aucun problème du serveur (sites, sauvegardes, disque). En cas de doute, ne supprimez rien : la copie sert à revenir en arrière.", ""],
    ["Ouvrez Freebox OS (mafreebox.freebox.fr) › Explorateur de fichiers › Freebox_Disk_01 › VMs.", ""],
    ["Supprimez uniquement le dossier « copie-sommeil-server-2026-11-12 ». Ne touchez jamais aux fichiers bmlab-server.qcow2 et bmlab-server.qcow2.efivars : c'est le serveur en service.", ""],
    ["Contrôle depuis PowerShell sur le PC : il ne doit plus rester que les deux fichiers bmlab-server. Puis « Fait » ici.", "Get-ChildItem Z:\\VMs -Recurse -File | Select-Object FullName, Length"],
  ]
  const etapes = app.findCollectionByNameOrId("etapes")
  ETAPES.forEach((x, i) => {
    const r = new Record(etapes)
    r.set("tache", t.id)
    r.set("ordre", (i + 1) * 10)
    r.set("texte", x[0])
    r.set("commande", x[1])
    app.save(r)
  })
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
