/// <reference path="../pb_data/types.d.ts" />

// Précision du propriétaire (12/11/2026, transmise par la session « Audit
// RGPD du site », CDC Pilotage 0.28) : réécrire les procédures elles-mêmes.
// - Purge trimestrielle de la messagerie du site contact@bmlab.fr : marche à
//   suivre du propriétaire (boîte de réception, éléments envoyés, éléments
//   supprimés, courrier indésirable) ; remplace la version de la migration
//   1811500000.
// - Contrôle de restauration : étape finale obligatoire, effacer la copie
//   déchiffrée de PSV et vider la corbeille de Windows (politique de
//   confidentialité, art. 9 : 30 jours au plus).
// Seules les étapes restées telles que les migrations précédentes les ont
// posées sont remplacées ; une étape modifiée par le propriétaire est gardée.
migrate((app) => {
  const etapes = app.findCollectionByNameOrId("etapes")
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
  // Supprime les étapes dont le texte figure dans la liste (versions posées
  // par Claude, jamais retouchées) ; rend le nombre d'étapes restantes.
  const retirer = (t, textes) => {
    let reste = 0
    etapesDe(t).forEach((e) => {
      if (textes.indexOf(e.getString("texte")) >= 0) app.delete(e)
      else reste++
    })
    return reste
  }

  // 1. Purge trimestrielle de la messagerie du site.
  const menage = tacheCommencant("Ménage RGPD")
  if (menage) {
    const reste = retirer(menage, [
      // Migration 1810700000 (Gmail)
      "But : respecter les durées de conservation annoncées par la politique de confidentialité de psv.bmlab.fr (messages de contact : 12 mois). Tous les trimestres.",
      "Ouvrez Gmail (le compte qui reçoit les messages du site) et tapez cette recherche :",
      "Cochez la case en haut de la liste, puis « Sélectionner toutes les conversations correspondant à cette recherche », et supprimez.",
      "Videz la corbeille (Corbeille › « Vider la corbeille maintenant ») : sinon, les messages restent encore 30 jours.",
      "Touchez « Fait » ici, avec en remarque le nombre de messages supprimés.",
      // Migration 1811500000 (première version contact@bmlab.fr)
      "But : respecter la politique de confidentialité de psv.bmlab.fr (art. 8) : les messages du formulaire de contact sont gardés 12 mois au plus. Tous les trimestres. Depuis le 12/11/2026, tous les e-mails du site arrivent sur contact@bmlab.fr (messagerie Infomaniak) ; Gmail n'est plus utilisé (il ne contenait que des essais du site).",
      "Sur le PC, ouvrez Outlook, compte contact@bmlab.fr (ou Infomaniak Mail dans le navigateur, mail.infomaniak.com). Dans la barre de recherche, choisissez « Toutes les boîtes aux lettres » ou « Tous les dossiers » et tapez le début d'objet des e-mails du site :",
      "Triez par date et sélectionnez les messages reçus il y a plus de 12 mois : messages du formulaire de contact et notifications du site qui les reprennent, ainsi que vos réponses envoyées (dossier « Éléments envoyés »). Supprimez-les.",
      "Videz les éléments supprimés : dans Outlook, clic droit sur « Éléments supprimés » › « Vider le dossier » (dans Infomaniak Mail : Corbeille › Vider). Sinon, les messages restent sur le serveur d'Infomaniak. Rien à faire sur l'iPhone et l'iPad : Mail se met à jour tout seul.",
    ])
    const base = reste ? etapesDe(menage)[reste - 1].getInt("ordre") : 0
    ;[
      ["But : respecter la politique de confidentialité de psv.bmlab.fr (art. 8) : les messages liés au site sont gardés 12 mois au plus. Tous les trimestres. Depuis le 12/11/2026, tout arrive sur contact@bmlab.fr (messagerie Infomaniak) ; Gmail n'est plus concerné pour le site. Les alertes techniques du serveur (sauvegarde, sécurité, rapport de la vitrine) peuvent être supprimées plus tôt, sans contrainte.", ""],
      ["Ouvrez Outlook sur le PC, compte contact@bmlab.fr (à défaut : Infomaniak Mail dans le navigateur, mail.infomaniak.com).", ""],
      ["Dans la boîte de réception, puis dans « Éléments envoyés » : triez par date et sélectionnez les messages liés au site de plus de 12 mois : formulaire « Nous contacter », notifications « Nouvel avis », échanges avec des clients. Astuce : leur objet commence souvent par « [Site PSV] ».", "[Site PSV]"],
      ["Supprimez-les, puis ouvrez « Éléments supprimés » et supprimez-les à nouveau (suppression définitive).", ""],
      ["Faites de même dans « Courrier indésirable » : messages liés au site de plus de 12 mois, supprimés, puis supprimés à nouveau dans « Éléments supprimés ».", ""],
      ["Touchez « Fait » ici : la date de la purge est notée. En remarque, le nombre de messages supprimés.", ""],
    ].forEach((x, i) => ajouterEtape(menage, base + (i + 1) * 10, x[0], x[1]))
    menage.set("titre", "Purge trimestrielle de la messagerie du site (contact@bmlab.fr, messages de plus de 12 mois)")
    menage.set("notes", "Depuis le 12/11/2026 (CDC PSV v3.199), les e-mails du site arrivent sur contact@bmlab.fr (Infomaniak), lue dans Outlook (PC) et Mail (iPhone, iPad). Gmail n'est plus concerné. Politique de confidentialité, art. 8 : 12 mois au plus.")
    app.save(menage)
  }

  // 2. Contrôle de restauration : étape finale obligatoire pour PSV.
  const restauration = tacheCommencant("Test de restauration d'une sauvegarde")
  if (restauration) {
    retirer(restauration, [
      "Si vous avez déchiffré une sauvegarde de PSV dans C:\\Users\\bmiof\\sauvegardes-psv (méthode du CDC PSV), effacez-la aussi, après CHAQUE contrôle : la politique de confidentialité (art. 9) annonce que les copies ne sont pas gardées plus de 30 jours.",
    ])
    etapesDe(restauration).forEach((e) => {
      const avant = e.getString("texte")
      const apres = avant.replace("Effacez tout C:\\Restauration : il contient des données personnelles en clair. Puis « Fait » ici, avec en remarque le projet testé, la date de la sauvegarde et le résultat.",
        "Effacez tout C:\\Restauration : il contient des données personnelles en clair.")
      if (apres !== avant) {
        e.set("texte", apres)
        app.save(e)
      }
    })
    const liste = etapesDe(restauration)
    const fin = liste.length ? liste[liste.length - 1].getInt("ordre") : 0
    ajouterEtape(restauration, fin + 10, "OBLIGATOIRE, après chaque contrôle de PSV : supprimez la copie déchiffrée dans C:\\Users\\bmiof\\sauvegardes-psv, puis videz la corbeille de Windows (la commande ci-dessous fait les deux ; elle vide toute la corbeille). Raison : la politique de confidentialité (art. 9) annonce 30 jours au plus de conservation des sauvegardes. Cochez cette étape.", "Remove-Item -Recurse -Force \"$env:USERPROFILE\\sauvegardes-psv\"; Clear-RecycleBin -Force")
    ajouterEtape(restauration, fin + 20, "Touchez « Fait » ici, avec en remarque le projet testé, la date de la sauvegarde, le résultat, et « copie déchiffrée effacée » pour PSV.", "")
  }
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
