import PDFDocument from 'pdfkit'

// ── Palette & constants ──────────────────────────────────────
const GREEN  = '#16a34a'
const DARK   = '#111827'
const GRAY   = '#6b7280'
const LIGHT  = '#f3f4f6'
const RED    = '#dc2626'

const MARGIN = 60
const LINE   = 16

function hrLine(doc: PDFKit.PDFDocument, y?: number) {
  const posY = y ?? doc.y
  doc.moveTo(MARGIN, posY).lineTo(doc.page.width - MARGIN, posY)
    .strokeColor('#e5e7eb').lineWidth(0.5).stroke()
  doc.moveDown(0.5)
}

function header(doc: PDFKit.PDFDocument, orgName: string, orgAddress: string) {
  // Green bar
  doc.rect(0, 0, doc.page.width, 6).fill(GREEN)

  doc.moveDown(1.5)

  // Logo placeholder + Org name
  doc.fontSize(18).fillColor(GREEN).font('Helvetica-Bold')
    .text('ParkClear', MARGIN, doc.y, { continued: false })

  doc.fontSize(9).fillColor(GRAY).font('Helvetica')
    .text(orgName, MARGIN)
    .text(orgAddress)

  doc.moveDown(1)
  hrLine(doc)
}

function footer(doc: PDFKit.PDFDocument, pageNum: number) {
  const y = doc.page.height - 40
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
    .text(
      `ParkClear — Document généré le ${new Date().toLocaleDateString('fr-FR')} · Page ${pageNum}`,
      MARGIN, y,
      { align: 'center', width: doc.page.width - MARGIN * 2 }
    )
  doc.moveTo(MARGIN, y - 8).lineTo(doc.page.width - MARGIN, y - 8)
    .strokeColor('#e5e7eb').lineWidth(0.5).stroke()
}

// ── LRAR Template ────────────────────────────────────────────
export interface LrarData {
  org: {
    name: string
    address: string
    city: string
    postal_code: string
    signer_name: string
    signer_title: string
  }
  site: {
    name: string
    address: string
    city: string
    postal_code: string
  }
  dossier: {
    id: string
    plate: string | null
    no_plate: boolean
    vehicle_type: string
    vehicle_brand: string | null
    vehicle_color: string | null
    location_spot: string | null
    created_at: string
  }
}

export function generateLrar(data: LrarData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN })

  const orgAddress = `${data.org.address}, ${data.org.postal_code} ${data.org.city}`
  header(doc, data.org.name, orgAddress)

  // Title block
  doc.moveDown(0.5)
  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
    .text('LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION', MARGIN, doc.y, { align: 'center' })
  doc.moveDown(0.5)

  // Date + city
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  doc.fontSize(10).fillColor(GRAY).font('Helvetica')
    .text(`${data.org.city}, le ${today}`, { align: 'right' })
  doc.moveDown(1)

  // Recipient block
  doc.rect(MARGIN, doc.y, 200, 70).fillAndStroke(LIGHT, '#e5e7eb')
  const recipY = doc.y + 10
  doc.fontSize(9).fillColor(GRAY).font('Helvetica')
    .text('À l\'attention du propriétaire du véhicule :', MARGIN + 10, recipY)
  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
    .text(data.dossier.plate ?? 'Plaque illisible', MARGIN + 10, recipY + 18)
    .text(`(${data.dossier.vehicle_type === 'epave' ? 'Épave' : 'Véhicule abandonné'})`, MARGIN + 10)
  doc.moveDown(2)

  // Subject
  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
    .text('Objet : Mise en demeure de retirer votre véhicule', MARGIN)
  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text(`Ref. dossier : ${data.dossier.id.slice(0, 8).toUpperCase()}`, MARGIN)
  doc.moveDown(1)

  hrLine(doc)
  doc.moveDown(0.5)

  // Salutation
  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text('Madame, Monsieur,')
  doc.moveDown(0.8)

  // Body — constat
  const vehicleDesc = [
    data.dossier.vehicle_brand,
    data.dossier.vehicle_color,
    data.dossier.plate ? `immatriculé ${data.dossier.plate}` : 'sans plaque lisible',
  ].filter(Boolean).join(' ')

  const constatDate = new Date(data.dossier.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text(
      `Nous avons constaté la présence de votre véhicule ${vehicleDesc} depuis le ${constatDate} sur le ` +
      `parking privé « ${data.site.name} », situé ${data.site.address}, ${data.site.postal_code} ${data.site.city}` +
      (data.dossier.location_spot ? `, à la place ${data.dossier.location_spot}` : '') +
      ', sans autorisation et sans titre de stationnement valable.',
      { lineGap: 3 }
    )
  doc.moveDown(0.8)

  // Legal basis
  doc.text(
    'Conformément aux dispositions des articles L325-12 et R325-48 du Code de la route, ' +
    'le gestionnaire d\'un parking privé est en droit de faire procéder à l\'enlèvement d\'un véhicule ' +
    'gênant ou abandonné sur son terrain, après mise en demeure préalable restée sans effet.',
    { lineGap: 3 }
  )
  doc.moveDown(0.8)

  // Formal notice
  doc.rect(MARGIN, doc.y, doc.page.width - MARGIN * 2, 55)
    .fillAndStroke('#fef3c7', '#d97706')

  const noticeY = doc.y + 10
  doc.fontSize(10).fillColor('#92400e').font('Helvetica-Bold')
    .text('MISE EN DEMEURE', MARGIN + 12, noticeY)
  doc.fontSize(10).fillColor('#92400e').font('Helvetica')
    .text(
      'Vous êtes mis en demeure de retirer votre véhicule dans un délai de 10 jours à compter de la réception ' +
      'de ce courrier. Passé ce délai, nous procèderons à son enlèvement à vos frais exclusifs.',
      MARGIN + 12, noticeY + 16,
      { width: doc.page.width - MARGIN * 2 - 24, lineGap: 2 }
    )

  doc.moveDown(3.5)

  // Consequences
  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text(
      'À défaut de déplacement de votre véhicule dans ce délai, nous ferons procéder à son enlèvement ' +
      'par une société agréée VHU (Véhicule Hors d\'Usage). Les frais d\'enlèvement et de gardiennage ' +
      'resteront à votre charge, conformément à la réglementation en vigueur.',
      { lineGap: 3 }
    )
  doc.moveDown(1)

  doc.text(
    'Dans l\'hypothèse où votre véhicule présente les caractéristiques d\'une épave, un officier de police ' +
    'judiciaire (OPJ) compétent sera saisi afin d\'établir un procès-verbal d\'abandon.',
    { lineGap: 3 }
  )
  doc.moveDown(1)

  // Closing
  doc.text(
    'Veuillez agréer, Madame, Monsieur, l\'expression de nos salutations distinguées.',
    { lineGap: 3 }
  )
  doc.moveDown(1.5)

  // Signature block
  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
    .text(data.org.signer_name)
  doc.fontSize(10).fillColor(GRAY).font('Helvetica')
    .text(data.org.signer_title)
    .text(data.org.name)

  doc.moveDown(2)
  hrLine(doc)

  // Legal footer note
  doc.fontSize(8).fillColor(GRAY).font('Helvetica-Oblique')
    .text(
      'Références légales : Code de la route, Art. L325-12 (enlèvement des véhicules gênants sur propriété privée), ' +
      'Art. R325-48 (procédure d\'enlèvement). Ce courrier vaut mise en demeure au sens du droit civil.',
      { lineGap: 2 }
    )

  footer(doc, 1)
  doc.end()
  return doc
}

// ── OPJ Dossier Template ─────────────────────────────────────
export interface OPJData extends LrarData {
  dossier: LrarData['dossier'] & {
    status: string
    lrar_sent_at: string | null
    deadline_at: string | null
    notes: string | null
    photos_count: number
  }
  timeline: { date: string; action: string }[]
}

export function generateOPJDossier(data: OPJData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN })

  const orgAddress = `${data.org.address}, ${data.org.postal_code} ${data.org.city}`
  header(doc, data.org.name, orgAddress)

  // Title
  doc.moveDown(0.5)
  doc.rect(MARGIN, doc.y, doc.page.width - MARGIN * 2, 44).fill(DARK)
  const titleY = doc.y + 10
  doc.fontSize(13).fillColor('#fff').font('Helvetica-Bold')
    .text('DOSSIER DE SIGNALEMENT — DEMANDE D\'INTERVENTION OPJ', MARGIN + 10, titleY)
  doc.fontSize(9).fillColor('#d1d5db').font('Helvetica')
    .text(
      `Ref. ${data.dossier.id.slice(0, 8).toUpperCase()} · Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      MARGIN + 10
    )
  doc.moveDown(1.5)

  // Legal basis box
  doc.rect(MARGIN, doc.y, doc.page.width - MARGIN * 2, 38).fillAndStroke('#dbeafe', '#93c5fd')
  const legalY = doc.y + 8
  doc.fontSize(9).fillColor('#1e40af').font('Helvetica-Bold')
    .text('Base légale :', MARGIN + 10, legalY, { continued: true })
  doc.font('Helvetica')
    .text(
      ' Article R325-48 du Code de la route — Procédure d\'enlèvement d\'un véhicule épave ou abandonné ' +
      'nécessitant l\'intervention d\'un Officier de Police Judiciaire.',
      { lineGap: 2 }
    )
  doc.moveDown(1.5)

  // Section 1 — Organisation
  sectionTitle(doc, '1. Organisation signalante')

  infoTable(doc, [
    ['Raison sociale', data.org.name],
    ['Adresse', orgAddress],
    ['Signataire', `${data.org.signer_name} — ${data.org.signer_title}`],
  ])

  doc.moveDown(1)

  // Section 2 — Parking
  sectionTitle(doc, '2. Lieu de constatation')
  infoTable(doc, [
    ['Nom du parking', data.site.name],
    ['Adresse', `${data.site.address}, ${data.site.postal_code} ${data.site.city}`],
    ['Place / Zone', data.dossier.location_spot ?? 'Non renseigné'],
  ])
  doc.moveDown(1)

  // Section 3 — Véhicule
  sectionTitle(doc, '3. Identification du véhicule')
  infoTable(doc, [
    ['Plaque d\'immatriculation', data.dossier.plate ?? 'ILLISIBLE / ABSENTE'],
    ['Type', data.dossier.vehicle_type === 'epave' ? 'ÉPAVE ⚠' : 'Véhicule abandonné (VA)'],
    ['Marque', data.dossier.vehicle_brand ?? 'Inconnue'],
    ['Couleur', data.dossier.vehicle_color ?? 'Inconnue'],
    ['Date de constatation', new Date(data.dossier.created_at).toLocaleDateString('fr-FR')],
    ['Photos réalisées', `${data.dossier.photos_count} photo(s) jointe(s)`],
  ])
  doc.moveDown(1)

  // Section 4 — Timeline
  sectionTitle(doc, '4. Chronologie des démarches')
  doc.moveDown(0.3)

  for (const event of data.timeline) {
    doc.fontSize(10).fillColor(DARK).font('Helvetica')
    doc.rect(MARGIN, doc.y, 3, 14).fill(GREEN)
    doc.text(`${event.date}`, MARGIN + 12, doc.y - 14, { continued: true, width: 90 })
    doc.fillColor(DARK).text(event.action, { lineGap: 2 })
    doc.moveDown(0.2)
  }

  doc.moveDown(1)

  // Section 5 — Declaration
  sectionTitle(doc, '5. Déclaration de l\'exploitant')
  doc.moveDown(0.3)
  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text(
      `Je soussigné(e), ${data.org.signer_name}, ${data.org.signer_title} de ${data.org.name}, ` +
      `certifie que le véhicule décrit ci-dessus est présent depuis plus de 10 jours sur notre propriété privée ` +
      `et que toutes les démarches préalables requises ont été effectuées, notamment :`,
      { lineGap: 3 }
    )
  doc.moveDown(0.5)

  const checklist = [
    'Constatation photographique du véhicule (date, lieu, état)',
    'Envoi d\'une lettre recommandée avec accusé de réception au propriétaire',
    data.dossier.lrar_sent_at
      ? `LRAR envoyée le ${new Date(data.dossier.lrar_sent_at).toLocaleDateString('fr-FR')}`
      : 'LRAR envoyée',
    'Délai de 10 jours écoulé sans réponse du propriétaire',
    'Impossibilité de contacter le propriétaire du véhicule',
  ]

  for (const item of checklist) {
    doc.text(`   ✓  ${item}`, { lineGap: 2 })
  }

  doc.moveDown(1)
  doc.text(
    'En conséquence, nous sollicitons l\'intervention d\'un Officier de Police Judiciaire pour constater ' +
    'l\'abandon du véhicule et autoriser son enlèvement conformément aux dispositions réglementaires en vigueur.',
    { lineGap: 3 }
  )

  doc.moveDown(2)

  // Signature
  doc.fontSize(10).fillColor(DARK).font('Helvetica')
    .text(`Fait à ${data.org.city}, le ${new Date().toLocaleDateString('fr-FR')}`)
  doc.moveDown(1.5)
  doc.font('Helvetica-Bold').text(data.org.signer_name)
  doc.font('Helvetica').fillColor(GRAY).text(data.org.signer_title)

  // Signature box
  doc.moveDown(0.5)
  doc.rect(doc.page.width - MARGIN - 160, doc.y - 50, 160, 50).stroke('#d1d5db')
  doc.fontSize(8).fillColor(GRAY).text('Signature et cachet :', doc.page.width - MARGIN - 155, doc.y - 44)

  if (data.dossier.notes) {
    doc.moveDown(2)
    hrLine(doc)
    doc.moveDown(0.3)
    doc.fontSize(9).fillColor(GRAY).font('Helvetica-Bold').text('Notes complémentaires :')
    doc.font('Helvetica').text(data.dossier.notes, { lineGap: 2 })
  }

  footer(doc, 1)
  doc.end()
  return doc
}

// ── Helpers ──────────────────────────────────────────────────
function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.rect(MARGIN, doc.y, doc.page.width - MARGIN * 2, 22).fill('#f3f4f6')
  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold')
    .text(title, MARGIN + 8, doc.y - 16)
  doc.moveDown(0.5)
}

function infoTable(doc: PDFKit.PDFDocument, rows: [string, string][]) {
  for (const [label, value] of rows) {
    const rowY = doc.y
    doc.fontSize(9).fillColor(GRAY).font('Helvetica')
      .text(label, MARGIN, rowY, { width: 160 })
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
      .text(value, MARGIN + 170, rowY, { width: doc.page.width - MARGIN * 2 - 170 })
    doc.moveDown(0.1)
    doc.moveTo(MARGIN, doc.y).lineTo(doc.page.width - MARGIN, doc.y)
      .strokeColor('#f3f4f6').lineWidth(0.5).stroke()
    doc.moveDown(0.2)
  }
}
