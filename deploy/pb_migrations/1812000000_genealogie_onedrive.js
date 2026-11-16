/// <reference path="../pb_data/types.d.ts" />

// Généalogie : originaux OneDrive à envoyer à la corbeille après contrôle
// (demande du propriétaire transmise par la session « Généalogie », 16/11/2026,
// CDC 0.35). Le 16/11/2026, les 1 081 fichiers de OneDrive\Généalogie et
// OneDrive\Généalogie (Documents validés) ont été copiés, classés et renommés
// dans S:\Généalogie, contrôle SHA-256 sans erreur ; journal de copie dans
// S:\Généalogie\00_Suivi. Jamais de suppression sans l'accord explicite du
// propriétaire, et seulement vers la corbeille. Créée une seule fois.
migrate((app) => {
  const TITRE = "Généalogie : envoyer à la corbeille les originaux OneDrive déjà migrés vers S:\\Généalogie"
  if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: TITRE }).length) return
  let d
  try {
    d = app.findFirstRecordByFilter("domaines", "nom = 'PC et sauvegardes'")
  } catch (e) {
    return
  }
  const t = new Record(app.findCollectionByNameOrId("taches"))
  const valeurs = {
    titre: TITRE, domaine: d.id, priorite: "important", mode: "unique",
    echeance: "2026-12-31 00:00:00.000Z", souplesse: "souple", tolerance: 15, etat: "active",
    notes: "Le 16/11/2026, les 1 081 fichiers de C:\\Users\\bmiof\\OneDrive\\Généalogie et C:\\Users\\bmiof\\OneDrive\\Généalogie (Documents validés) ont été copiés, classés et renommés dans S:\\Généalogie, avec un contrôle SHA-256 sans aucune erreur.\n" +
      "Journal de copie (source, destination finale et empreinte de chaque fichier) : S:\\Généalogie\\00_Suivi\\2026-11-16_Journal-copie-OneDrive.csv.",
  }
  Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
  app.save(t)

  const ETAPES = [
    ["But : libérer OneDrive des originaux de généalogie, maintenant rangés dans S:\\Généalogie, sans rien perdre. Rien n'est supprimé définitivement : les originaux vont à la corbeille de OneDrive, où ils restent récupérables 30 jours.", ""],
    ["Vérifiez vous-même le classement dans S:\\Généalogie (Explorateur) : dossiers, noms des fichiers, quelques documents ouverts au hasard. Si quelque chose ne va pas, arrêtez-vous ici et reportez la tâche.", ""],
    ["Ouvrez une session Claude dans le projet Généalogie et demandez : « Revérifier l'empreinte SHA-256 de chaque fichier, côté S: et côté OneDrive, d'après le journal S:\\Généalogie\\00_Suivi\\2026-11-16_Journal-copie-OneDrive.csv ». Le résultat attendu : 1 081 fichiers identiques, aucune différence, aucun fichier manquant.", ""],
    ["Seulement si la revérification est parfaite, et seulement avec votre accord donné à Claude dans cette session : envoi des originaux OneDrive à la corbeille (jamais de suppression définitive).", ""],
    ["Vérifiez sur onedrive.live.com que les fichiers sont bien dans la corbeille de OneDrive ; ils y restent 30 jours. Ne videz pas la corbeille.", ""],
    ["Touchez « Fait » ici, avec en remarque le nombre de fichiers revérifiés et envoyés à la corbeille.", ""],
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
