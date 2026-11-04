/// <reference path="../pb_data/types.d.ts" />

// Mise en conformité électrique de l'appartement 405 (demande du propriétaire,
// 04/11/2026, puis relevé du tableau du 19/11/2026 ; CDC 0.37). Sources :
// diagnostic électricité du 14/09/2023 (Habitat Plus Immobilier, commandé par
// Foncia, valable jusqu'au 14/09/2029), devis Electro'Cime n° 210328 du
// 09/01/2024 (682,63 € TTC, périmé), photos du tableau du 04/11/2026, relevé
// manuscrit du propriétaire (circuit par circuit, rangées A et B).
// Travaux pas encore faits au 19/11/2026.
//
// Crée une seule fois, chacune seulement si son titre n'existe pas encore :
// une fiche de référence « Tableau électrique » (photos dans ses étapes) et
// six tâches. Si la fiche du tableau existe déjà (première version de cette
// migration, numérotée 1811500000, installée depuis le dossier de travail),
// ses étapes 2 et 3 et ses notes reçoivent le relevé détaillé, seulement si
// elles n'ont pas été modifiées depuis. Le diagnostic et le devis (première
// tâche) et la page d'étiquettes (fiche du tableau) sont joints à des notes,
// s'ils ont été déposés au préalable dans
// /opt/pocketbase-pilotage/import/electricite_405/ (le service ne voit pas
// /tmp). Sans ces fichiers, tout est créé quand même, sans pièces jointes.
migrate((app) => {
  let d
  try {
    d = app.findFirstRecordByFilter("domaines", "nom = 'Appartement 405'")
  } catch (e) {
    return
  }
  const DOSSIER = "/opt/pocketbase-pilotage/import/electricite_405/"
  const taches = app.findCollectionByNameOrId("taches")
  const etapes = app.findCollectionByNameOrId("etapes")

  const fichier = (nom) => {
    try {
      $os.stat(DOSSIER + nom)
      return $filesystem.fileFromPath(DOSSIER + nom)
    } catch (e) {
      return null
    }
  }

  // Crée la fiche si son titre n'existe pas ; renvoie null si elle existait.
  const creer = (valeurs, liste) => {
    if (app.findRecordsByFilter("taches", "titre = {:t}", "", 1, 0, { t: valeurs.titre }).length) return null
    const t = new Record(taches)
    const base = { domaine: d.id, etat: "active" }
    Object.keys(base).forEach((k) => t.set(k, base[k]))
    Object.keys(valeurs).forEach((k) => t.set(k, valeurs[k]))
    app.save(t)
    liste.forEach((x, i) => {
      const r = new Record(etapes)
      r.set("tache", t.id)
      r.set("ordre", (i + 1) * 10)
      r.set("texte", x[0])
      r.set("commande", "")
      const photos = (x[1] || []).map(fichier).filter((f) => f)
      if (photos.length) r.set("photos", photos)
      app.save(r)
    })
    return t
  }

  const CONTACT = "Electro'Cime (électricien, auteur du devis de 2024) : 46B avenue de la Libération, 05100 Briançon ; 07 69 22 33 62 ; electrocime@gmail.com.\n" +
    "Agence Cimes et Neige Immobilier : gestion des locations, accès à l'appartement et planning des séjours."
  const RESUME = "Diagnostic électricité du 14/09/2023 (Habitat Plus Immobilier, commandé par Foncia, valable jusqu'au 14/09/2029) : trois défauts.\n" +
    "1) Interrupteurs différentiels de 40 A derrière un disjoncteur d'abonnement réglé sur 45 A : l'interrupteur n'est pas protégé contre la surcharge (risque d'échauffement). Correction : deux interrupteurs différentiels de 63 A.\n" +
    "2) Liaison à la terre des parties métalliques de la salle de bains insuffisante (plus de 2 ohms).\n" +
    "3) Matériel interdit trop près de la baignoire : meuble miroir à spots, non étanche, à moins de 60 cm.\n" +
    "Devis Electro'Cime n° 210328 du 09/01/2024 : 682,63 € TTC (2 interrupteurs 63 A Hager, fil de terre, protection provisoire du meuble miroir, déplacement), adressé à Foncia, valable un mois : périmé. Type des interrupteurs non précisé.\n" +
    "Photos du tableau : fiche « Tableau électrique de l'appartement 405 »."

  // Fiche de référence : le tableau, avec les photos du 04/11/2026 et le
  // relevé du 19/11/2026.
  const TITRE_TABLEAU = "Tableau électrique de l'appartement 405"
  const NOTES_TABLEAU = "Relevé du propriétaire du 19/11/2026 (circuit par circuit), avant travaux. Rangée A = celle du haut, rangée B = celle du dessous ; numéros de gauche à droite.\n" +
    "Étiquettes refaites en novembre 2026 : petites étiquettes dans les fenêtres des disjoncteurs (14 × 9 mm ; différentiels 33 × 9 mm) et grande bande sous chaque rangée (231 × 29 mm), imprimées en taille réelle sur papier ordinaire (PDF joint en note). Aucun calibre écrit sur les différentiels, qui passeront de 40 A à 63 A.\n" +
    "À mettre à jour après le remplacement des interrupteurs différentiels (nouvelles photos dans les étapes 2 et 3).\n" +
    "Aucun parafoudre. A3 (2 A) : rôle à confirmer par l'électricien, très probablement la commande heures creuses du chauffe-eau. Prise de la salle de bains notée sur A5, à confirmer (essai avec une lampe). Pas de lave-linge ni de VMC."
  const ANCIENNES = [
    "Rangée 1, derrière l'interrupteur différentiel Hager CDC 742F, 40 A, 30 mA, type AC. De gauche à droite : sonnerie (SU 213), horloge (EH 010), interrupteur différentiel, disjoncteurs : 2 A sans étiquette, éclairage 10 A, prises 16 A, cuisine 20 A, chauffage 16 A, chauffe-eau 16 A, puis le contacteur heures creuses du chauffe-eau (ETC 225).",
    "Rangée 2, derrière l'interrupteur différentiel Hager CDA 743F, 40 A, 30 mA, type A (obligatoire pour les plaques et le lave-linge). Disjoncteurs : éclairage 10 A, prises 16 A, lave-linge 20 A, plaques de cuisson 32 A, chauffage 16 A.",
  ]
  const NOUVELLES = [
    "Rangée A (en haut), de gauche à droite :\n" +
      "A1 : sonnerie de la sonnette (Hager SU 213) et horloge (Hager EH 010), sans petite étiquette.\n" +
      "A2 : interrupteur différentiel Hager CDC 742F, 40 A, 30 mA, type AC : coupe toute la rangée A.\n" +
      "A3 : disjoncteur 2 A (MFN 702) : commande heures creuses du chauffe-eau, à confirmer.\n" +
      "A4 : 10 A (MFN 710), lumières : plafonniers des toilettes, du hall d'accueil et du séjour, appliques du séjour, miroir de la salle de bains, sonnette extérieure.\n" +
      "A5 : 16 A (MFN 716), prises : hall d'accueil, 2 au pied du canapé, télé gauche et droite, pied de table ; salle de bains (à confirmer).\n" +
      "A6 : 20 A (MFN 720), lave-vaisselle.\n" +
      "A7 : 16 A (MFN 716), radiateur du séjour.\n" +
      "A8 : 16 A (MFN 716), chauffe-eau.\n" +
      "A9 : contacteur heures creuses Hager ETC 225, 25 A, du chauffe-eau (manette : Auto = heures creuses, 1 = marche forcée, 0 = arrêt).",
    "Rangée B (en dessous), de gauche à droite :\n" +
      "B1 : interrupteur différentiel Hager CDA 743F, 40 A, 30 mA, type A (obligatoire pour les plaques) : coupe toute la rangée B.\n" +
      "B2 : 10 A (MFN 710), lumières : plafonnier et appliques de la chambre, plafonnier de la cuisine, néon de l'évier.\n" +
      "B3 : 16 A (MFN 716), prises : 2 au pied du lit et 1 en tête de lit (chambre), plan de travail gauche et droite, frigo.\n" +
      "B4 : 20 A (MFN 720), mini-four.\n" +
      "B5 : 32 A (MFN 732), plaques de cuisson.\n" +
      "B6 : 16 A (MFN 716), radiateur de la chambre et sèche-serviettes de la salle de bains.",
  ]
  const tableau = creer({
    titre: TITRE_TABLEAU,
    priorite: "confort", mode: "reference", souplesse: "souple",
    notes: NOTES_TABLEAU,
  }, [
    ["Vue d'ensemble et arrivée du courant. Compteur électronique Sagemcom (2015, pas un Linky). Disjoncteur d'abonnement BACO, 500 mA sélectif, réglé sur 45 A (abonnement de 9 kVA probablement). C'est lui qui coupe tout l'appartement. Tableau Hager : deux rangées en service, une troisième libre.", ["tableau_vue_ensemble.jpg", "compteur_et_disjoncteur_abonnement.jpg"]],
    [NOUVELLES[0], ["tableau_rangee_1.jpg"]],
    [NOUVELLES[1], ["tableau_rangee_2.jpg"]],
    ["Si tout l'appartement est coupé : regarder d'abord le disjoncteur d'abonnement (en haut, à droite du compteur), puis les deux interrupteurs différentiels (le plus large de chaque rangée). Un interrupteur différentiel qui coupe signale une fuite de courant : le remonter une fois ; s'il recoupe, baisser tous les disjoncteurs de sa rangée, le remonter, puis remonter les disjoncteurs un par un pour trouver le circuit fautif, et prévenir l'agence. Les locataires appellent toujours l'agence, jamais le propriétaire.", []],
  ])
  let fiche = tableau
  if (!fiche) {
    // Première version déjà installée : relevé détaillé, sans écraser une
    // modification faite dans l'application.
    fiche = app.findFirstRecordByFilter("taches", "titre = {:t}", { t: TITRE_TABLEAU })
    if ((fiche.getString("notes") || "").indexOf("Relevé sur les photos du 04/11/2026") === 0) {
      fiche.set("notes", NOTES_TABLEAU)
      app.save(fiche)
    }
    app.findRecordsByFilter("etapes", "tache = {:t}", "ordre", 20, 0, { t: fiche.id }).forEach((r) => {
      const k = ANCIENNES.indexOf(r.getString("texte"))
      if (k >= 0) {
        r.set("texte", NOUVELLES[k])
        app.save(r)
      }
    })
  }
  const pdf = fichier("etiquettes_tableau.pdf")
  if (pdf && !app.findRecordsByFilter("historique", "tache = {:t} && remarque ~ 'Étiquettes du tableau'", "", 1, 0, { t: fiche.id }).length) {
    const h = new Record(app.findCollectionByNameOrId("historique"))
    h.set("tache", fiche.id)
    h.set("type", "note")
    h.set("date", "2026-11-19 00:00:00.000Z")
    h.set("remarque", "Étiquettes du tableau (novembre 2026) : page A4 paysage à imprimer en taille réelle (100 %), carré de contrôle de 50 mm. Petites étiquettes 14 × 9 mm et 33 × 9 mm, bandes 231 × 29 mm sous chaque rangée.")
    h.set("justificatifs", [pdf])
    app.save(h)
  }

  const t1 = creer({
    titre: "Électricité 405 : demander un devis neuf (et un second devis)",
    priorite: "critique", mode: "unique", souplesse: "souple", tolerance: 3,
    echeance: "2026-11-18 00:00:00.000Z",
    contacts: CONTACT,
    notes: RESUME,
  }, [
    ["Pourquoi : le devis d'Electro'Cime du 09/01/2024 est périmé (valable un mois) et adressé à Foncia, qui n'est plus l'agence. Il faut un devis neuf à votre nom, et un second devis pour comparer. Le diagnostic et l'ancien devis sont joints à la note de cette fiche ; les photos du tableau sont dans la fiche « Tableau électrique de l'appartement 405 ».", []],
    ["Écrire à Electro'Cime (adresse dans les contacts), avec le diagnostic, l'ancien devis et les 4 photos du tableau en pièces jointes. Texte proposé :\n« Bonjour, en janvier 2024 vous aviez établi le devis n° 210328 pour l'appartement 405 de la résidence Le Hameau des Écrins à Puy-Saint-Vincent, à la demande de Foncia. Je suis le propriétaire ; l'appartement est désormais géré par l'agence Cimes et Neige Immobilier. Les travaux n'ont pas été faits. Pourriez-vous m'adresser un devis à jour, à mon nom, en précisant : 1) le type de chacun des deux interrupteurs différentiels 63 A 30 mA : la rangée du bas (plaques de cuisson) est aujourd'hui en type A et doit le rester ; celle du haut est en type AC, mais elle alimente le lave-vaisselle : je souhaite donc deux interrupteurs de type A ; 2) la liaison équipotentielle de la salle de bains ; 3) la mise en sécurité du meuble miroir et, à part, le prix de son remplacement par un modèle conforme ; 4) en option : le resserrage des bornes du tableau, l'étiquetage du disjoncteur 2 A et un parafoudre. Il faudrait intervenir avant le 12 décembre, sur un créneau à fixer avec l'agence. Je vous remercie. »", []],
    ["Demander un second devis à un autre électricien du secteur (Briançon, Vallouise, L'Argentière) : demander un nom à l'agence Cimes et Neige ou au syndic. Lui envoyer le même message et les mêmes pièces jointes.", []],
    ["Si un électricien doit voir l'appartement avant de chiffrer : prévenir l'agence Cimes et Neige pour l'accès, sur un jour sans locataire.", []],
    ["Pour comparer les devis, vérifier qu'ils précisent tous : 2 interrupteurs différentiels 63 A 30 mA, idéalement les deux en type A (au minimum celui de la rangée B, du bas) ; marque et référence ; liaison équipotentielle de la salle de bains ; traitement du meuble miroir (provisoire ou remplacement) ; déplacement ; TVA à 10 % ; délai et durée de la coupure ; facture détaillée à la fin. Un Consuel n'est pas nécessaire pour ces travaux.", []],
    ["Touchez « Fait » quand les devis sont arrivés, et joignez-les en justificatifs. Passez ensuite à « Électricité 405 : choisir le devis, le signer et verser l'acompte ».", []],
  ])

  if (t1) {
    const pj = ["diagnostic_electricite_2023-09-14.pdf", "devis_electrocime_210328_2024-01-09.pdf"].map(fichier).filter((f) => f)
    const h = new Record(app.findCollectionByNameOrId("historique"))
    h.set("tache", t1.id)
    h.set("type", "note")
    h.set("date", "2026-11-04 00:00:00.000Z")
    h.set("remarque", pj.length
      ? "Documents d'origine : diagnostic électricité du 14/09/2023 et devis Electro'Cime n° 210328 du 09/01/2024 (périmé). Photos du tableau : fiche « Tableau électrique de l'appartement 405 »."
      : "Documents d'origine à joindre (« 📝 Note ») : diagnostic électricité du 14/09/2023 et devis Electro'Cime n° 210328 du 09/01/2024, dans Google Drive > Appartement Puy Saint Vincent > Électricité.")
    if (pj.length) h.set("justificatifs", pj)
    app.save(h)
  }

  creer({
    titre: "Électricité 405 : choisir le devis, le signer et verser l'acompte",
    priorite: "important", mode: "unique", souplesse: "souple", tolerance: 3,
    echeance: "2026-11-25 00:00:00.000Z",
    contacts: CONTACT,
  }, [
    ["Comparer les devis reçus avec la liste de l'étape 5 de « demander un devis neuf ». Le moins cher n'est pas forcément le bon : celui de la rangée B (du bas) doit être en type A, idéalement les deux. En cas de doute, en parler avec Claude en joignant les devis.", []],
    ["Signer le devis choisi : date, signature et « Lu et approuvé, bon pour accord ». Le renvoyer à l'électricien.", []],
    ["Verser l'acompte demandé (50 % pour Electro'Cime) ; garder la preuve du virement.", []],
    ["Prévenir l'agence Cimes et Neige que les travaux sont commandés.", []],
    ["Touchez « Fait » avec le devis signé et la preuve de l'acompte en justificatifs, le montant de l'acompte en coût.", []],
  ])

  creer({
    titre: "Électricité 405 : fixer la date de l'intervention avec l'électricien et l'agence",
    priorite: "critique", mode: "unique", souplesse: "souple", tolerance: 3,
    echeance: "2026-11-28 00:00:00.000Z",
    contacts: CONTACT,
  }, [
    ["Demander à l'agence Cimes et Neige les jours libres avant les premières arrivées de la saison d'hiver (objectif : travaux finis le 12/12/2026 au plus tard).", []],
    ["Proposer ces jours à l'électricien. Le courant sera coupé pendant les travaux (une demi-journée environ) : jamais pendant un séjour.", []],
    ["Régler l'accès : remise des clés par l'agence, ou présence de quelqu'un sur place.", []],
    ["Confirmer la date par écrit (e-mail) à l'électricien et à l'agence, puis reporter cette date dans la fiche « Électricité 405 : intervention de l'électricien et réception des travaux » (Modifier la fiche > échéance).", []],
    ["Touchez « Fait » avec la date retenue en remarque.", []],
  ])

  creer({
    titre: "Électricité 405 : intervention de l'électricien et réception des travaux",
    priorite: "critique", mode: "unique", souplesse: "imperative",
    echeance: "2026-12-12 00:00:00.000Z",
    preparation: "Confirmer le rendez-vous avec l'électricien et l'accès avec l'agence Cimes et Neige.",
    preparation_jours: 5,
    condition: "Avant l'arrivée des premiers locataires de la saison d'hiver.",
    contacts: CONTACT,
  }, [
    ["Le jour venu : l'électricien remplace les deux interrupteurs différentiels, tire le fil de terre de la salle de bains et sécurise (ou remplace) le meuble miroir.", []],
    ["Demander à l'électricien (ou à l'agence) une photo du tableau après travaux, de face, où on lit les inscriptions.", []],
    ["Vérifier sur la photo : deux interrupteurs différentiels marqués « 63 A » et « 30 mA » ; celui de la rangée B (du bas, plaques) porte la lettre « A » ; tous les disjoncteurs sont remontés. Comparer avec les photos de la fiche « Tableau électrique de l'appartement 405 ».", []],
    ["Demander à l'électricien d'appuyer sur le bouton « T » (test) de chaque interrupteur différentiel : il doit couper aussitôt ; puis il le remonte.", []],
    ["Récupérer la facture détaillée : marque, référence, calibre et type de chaque interrupteur, liaison équipotentielle, meuble miroir, avec la mention que les défauts du diagnostic du 14/09/2023 sont levés. Payer le solde.", []],
    ["Mettre à jour la fiche « Tableau électrique de l'appartement 405 » : nouvelles photos dans les étapes 2 et 3, texte corrigé (63 A). Envoyer une copie de la facture à l'agence.", []],
    ["Touchez « Fait » avec la facture et la photo du tableau en justificatifs, le montant total en coût.", []],
  ])

  creer({
    titre: "Électricité 405 : remplacer le meuble miroir de la salle de bains",
    priorite: "important", mode: "unique", souplesse: "souple", tolerance: 15,
    echeance: "2027-04-30 00:00:00.000Z",
    contacts: CONTACT,
    notes: "Le meuble miroir à spots est non étanche et à moins de 60 cm de la baignoire (zone 2) : interdit. Le devis de 2024 ne prévoyait qu'une protection provisoire de son branchement, l'électricien jugeant le remplacement nécessaire « rapidement ». Si ce remplacement est fait lors de l'intervention de décembre, toucher « Fait » directement.",
  }, [
    ["Choisir un meuble miroir ou un éclairage autorisé à cet endroit (au moins IPX4, classe II, marquage pour salle de bains) aux mêmes dimensions ; demander conseil à l'électricien.", []],
    ["Faire poser par l'électricien pendant l'intersaison (avril), sur un créneau sans locataire fixé avec l'agence.", []],
    ["Touchez « Fait » avec la facture en justificatif.", []],
  ])

  creer({
    titre: "Appartement 405 : refaire le diagnostic électricité (valable jusqu'au 14/09/2029)",
    priorite: "confort", mode: "unique", souplesse: "imperative",
    echeance: "2029-09-14 00:00:00.000Z",
    rappel_jours: 90,
    notes: "Diagnostic du 14/09/2023 (Habitat Plus Immobilier, Briançon), valable 6 ans. Il sert pour louer à l'année et pour vendre ; pour la location saisonnière, demander à l'agence s'il est exigé. Joindre la facture des travaux de 2026 pour montrer que les défauts sont levés.",
  }, [
    ["Demander à l'agence Cimes et Neige si le diagnostic doit être renouvelé (location saisonnière, projet de vente).", []],
    ["Si oui : commander un diagnostic électricité à un diagnostiqueur certifié, en lui transmettant la facture des travaux de 2026.", []],
    ["Touchez « Fait » avec le nouveau diagnostic en justificatif.", []],
  ])
}, (app) => {
  // Retour en arrière volontairement vide : on ne supprime jamais les
  // données du propriétaire.
})
