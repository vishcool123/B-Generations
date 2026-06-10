const form = document.getElementById("billForm");
const ndaForm = document.getElementById("ndaForm");
const preview = document.getElementById("documentPreview");
const previewTitle = document.getElementById("previewTitle");
const itemsTable = document.getElementById("itemsTable");
const bankDetailsTable = document.getElementById("bankDetailsTable");
const addItemButton = document.getElementById("addItem");
const addBankDetailButton = document.getElementById("addBankDetail");
const resetButton = document.getElementById("resetButton");
const downloadButton = document.getElementById("downloadPdf");
const saveDraftButton = document.getElementById("saveDraft");
const draftSelect = document.getElementById("draftSelect");
const loadDraftButton = document.getElementById("loadDraft");
const saveStatus = document.getElementById("saveStatus");
const prevPageButton = document.getElementById("prevPage");
const nextPageButton = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");
const signatureCanvas = document.getElementById("signatureCanvas");
const clearSignatureButton = document.getElementById("clearSignature");
const billModeButton = document.getElementById("billMode");
const ndaModeButton = document.getElementById("ndaMode");
const resetNdaButton = document.getElementById("resetNdaButton");
const ndaSectionsEditor = document.getElementById("ndaSectionsEditor");

const STORAGE_KEY = "cyphrix.bill.generator";
const DRAFTS_KEY = "cyphrix.bill.generator.drafts";
const NDA_STORAGE_KEY = "cyphrix.nda.generator";
const NDA_DRAFTS_KEY = "cyphrix.nda.generator.drafts";
const NDA_CONTENT_VERSION = "pdf-context-v1";

let activeMode = "bill";
let items = [
  { description: "Website design and development", amount: 25000 },
  { description: "Domain, hosting, and deployment support", amount: 5000 },
];
let bankDetails = [
  { label: "Bank", value: "" },
  { label: "Account Holder", value: "" },
  { label: "Account No", value: "" },
  { label: "IFSC / Routing", value: "" },
];
let signatureStrokes = [];
let activeSignatureStroke = null;
let ndaSections = [];
let revertedNdaSections = new Set();
let currentPreviewPage = 0;
let latestPreviewPages = [];

const today = new Date();
const dueDate = new Date(today);
dueDate.setDate(today.getDate() + 7);

const defaults = {
  documentType: "Invoice",
  billNumber: "CYX-2026-001",
  issueDate: toInputDate(today),
  dueDate: toInputDate(dueDate),
  clientName: "",
  clientContact: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  projectTitle: "",
  scope: "Requirement discussion and planning\nUI/UX design and responsive development\nTesting, deployment, and handover support",
  taxRate: "18",
  advance: "0",
  companyName: "Cyphrix Technologies",
  companyWebsite: "https://cyphrixtech.com/",
  companyEmail: "support@cyphrixtech.com",
  companyPhone: "+91 6351163830",
  companyAddress: "74/75/76B, Sukhsagar Society, Chitra, Bhavnagar, 364004 India",
  authorizedPerson: "",
  designation: "",
  typedSignature: "",
  terms: "Payment is requested as per the due date. Work begins after confirmation and advance payment. Any additional scope will be billed separately.",
};

const ndaDefaults = {
  effectiveDate: toInputDate(today),
  docRef: "CYX-NDA-001",
  clientName: "",
  clientEmail: "",
  clientWebsite: "",
  clientContact: "",
  projectService: "",
  fixedFee: "",
  hourlyRate: "",
  retainer: "",
  paymentNotes: "50% deposit due on signing, 25% milestone payment, and 25% final payment due on delivery unless otherwise stated in the SOW.",
  providerSignatory: "Cyphrix Technologies",
  clientSignatory: "",
  providerSignature: "",
  clientSignature: "",
};

const ndaSectionDefaults = [
  {
    title: "Purpose",
    body:
      'The Parties wish to explore and/or enter into a professional engagement whereby Cyphrix Technologies will provide technology services including but not limited to software development, blockchain and smart contract solutions, web and mobile application development, cybersecurity consulting, and related technical services (the "Project"). In the course of this engagement, both Parties may disclose information of a confidential and proprietary nature.',
  },
  {
    title: "Definition of Confidential Information",
    body:
      '"Confidential Information" means any non-public information disclosed by either Party in connection with the Project - orally, in writing, electronically, or by any other means. For Cyphrix Technologies, this specifically includes:\n- Proprietary development frameworks, tools, codebases, and internal libraries\n- System architecture designs, technical documentation, and deployment configurations\n- Smart contract logic, blockchain integration methods, and cryptographic implementations\n- Pricing structures, project proposals, and client acquisition strategies\n- Business plans, roadmaps, investor information, and partnership details\n- Source code (delivered or undelivered), API keys, credentials, and access tokens\n- Internal processes, workflows, team structures, and operational methodologies\n- Any information marked "Confidential" or that a reasonable person would understand to be confidential\n\nFor the Client, Confidential Information includes project requirements, business logic, user data specifications, and any proprietary information shared to enable Cyphrix Technologies to deliver the agreed services.',
  },
  {
    title: "Obligations of the Receiving Party",
    body:
      "Each Party receiving Confidential Information agrees to:\n- Protect it with at least the same degree of care used for its own confidential information, but no less than reasonable care\n- Not disclose it to any third party without prior written consent from the disclosing Party\n- Use it exclusively for the purpose of evaluating or executing the Project\n- Restrict access to personnel with a strict need-to-know, each bound by equivalent obligations\n- Not reverse-engineer, decompile, or attempt to derive the underlying logic of any disclosed technology\n- Immediately notify the disclosing Party upon discovering any actual or suspected unauthorised disclosure\n\nBoth sides must guard each other's secrets carefully - you cannot share, copy, or reverse-engineer anything received, and must report any leak immediately.",
  },
  {
    title: "Exclusions from Confidentiality",
    body:
      "Obligations in Section 3 do not apply to information that the receiving Party can demonstrate:\n- Was already in the public domain at the time of disclosure through no fault of the receiving Party\n- Was already rightfully known to the receiving Party prior to disclosure, without restriction\n- Was independently developed without reference to the Confidential Information\n- Was received from a third party legitimately and without confidentiality restrictions\n- Is required to be disclosed by applicable law, regulation, or court order, provided prompt prior written notice is given and reasonable cooperation is extended to seek protective relief",
  },
  {
    title: "Term of Confidentiality",
    body:
      "This Agreement is effective from the Effective Date for a period of two (2) years. Confidentiality obligations under Sections 2, 3, and 7 survive expiration or termination of this Agreement for a further period of three (3) years, and survive indefinitely with respect to trade secrets.",
  },
  {
    title: "Return or Destruction of Information",
    body:
      "Upon written request or upon termination of the engagement, each Party shall promptly return or securely destroy all Confidential Information received from the other Party (including copies, notes, and derivatives), and shall provide written certification of such return or destruction within five (5) business days.",
  },
  {
    title: "Intellectual Property and Ownership",
    body:
      "All intellectual property created by Cyphrix Technologies - including code, designs, documentation, and deliverables - remains the exclusive property of Cyphrix Technologies until full payment has been received for the applicable project phase. Upon receipt of full payment, ownership of the agreed deliverables transfers to the Client as specified in the Statement of Work.\n\nCyphrix Technologies retains perpetual rights to:\n- Any pre-existing IP, frameworks, or tools used in delivery\n- Generic, non-Client-specific methodologies and learnings derived from the engagement\n- Portfolio rights to reference the project publicly unless the Client requests confidentiality in writing\n\nNothing in this Agreement grants either Party any license, trademark, or patent rights beyond what is explicitly stated.\n\nYou own the final product only after full payment - until then it's ours. We always keep our tools, methods, and the right to show this work in our portfolio.",
  },
  {
    title: "Non-Solicitation",
    body:
      "During the term of this Agreement and for one (1) year following its termination, neither Party shall directly solicit or hire any employee, contractor, or consultant of the other Party who was involved in the Project, without prior written consent.\n\nFor one year after the project ends, you cannot poach our developers or team members - and we won't recruit yours either.",
  },
  {
    title: "Remedies",
    body:
      "Both Parties acknowledge that a breach of confidentiality obligations may cause irreparable harm for which monetary damages would be an insufficient remedy. Accordingly, Cyphrix Technologies shall be entitled to seek immediate injunctive or other equitable relief from a court of competent jurisdiction, without the requirement to post bond, in addition to all other remedies at law or in equity.\n\nIf you leak our secrets, we can go to court immediately to stop the damage - we don't have to wait or only ask for money.",
  },
  {
    title: "Project Fees",
    body:
      'Fees for each engagement shall be agreed upon in a separate Statement of Work ("SOW") or project proposal issued by Cyphrix Technologies. All fees are exclusive of applicable taxes (GST, VAT, or equivalent) unless stated otherwise.',
  },
  {
    title: "Payment Schedule",
    body:
      "Unless the applicable SOW specifies otherwise:\n- 50% deposit is due upon signing of this Agreement or the applicable SOW, before work commences\n- 25% milestone payment is due upon completion of the agreed mid-project milestone\n- 25% final payment is due upon delivery of final files, deployables, or completion of the agreed scope\n- All invoices are due within 7 calendar days of the invoice date",
  },
  {
    title: "Late Payments",
    body:
      "If any amount is not received by the due date:\n- Interest accrues at 2% per month (or the maximum rate permitted by applicable law) on the overdue balance\n- Cyphrix Technologies may suspend all active work, access, and deliverables without liability until the account is settled\n- Final deliverables, source code, credentials, and deployment access will be withheld until all outstanding amounts are cleared\n- Cyphrix Technologies reserves the right to terminate the engagement after 14 days of non-payment, without refund of amounts already earned\n\nPay on time - late payments attract 2% monthly interest, we pause all work, withhold your files, and can cancel the project entirely after 14 days.",
  },
  {
    title: "Refund Policy",
    body:
      "The initial deposit is strictly non-refundable once work has commenced. Additional refund conditions:\n- If the Client cancels after commencement, payment is owed for all work completed to the cancellation date, calculated pro-rata against the agreed project fee\n- No refunds are payable once final deliverables have been approved or accepted by the Client (expressly or by silence after 7 days)\n- Disputes regarding deliverable quality must be raised within 7 days of delivery - silence constitutes acceptance\n\nThe deposit is gone once we start. If you cancel mid-project, you pay for what's done. Review deliverables within 7 days or they're considered accepted.",
  },
  {
    title: "Invoicing and Currency",
    body:
      "All invoices are issued electronically via cyphrixsupport@cyphrixtech.com. Unless otherwise agreed in writing, payments shall be made in INR or USD via bank transfer, UPI, or another mutually agreed payment method. The Client bears responsibility for all transaction fees, foreign exchange costs, and applicable withholding taxes.",
  },
  {
    title: "Termination",
    body:
      "Either Party may terminate this Agreement with 14 days' written notice. Upon termination, the Client shall pay for all work completed up to the termination date. Sections 3, 7, 8, 9, 12, and 13 survive termination.",
  },
  {
    title: "Dispute Resolution",
    body:
      "The Parties shall first attempt to resolve any dispute through good-faith negotiation within 30 days of written notice. If unresolved, disputes shall be referred to binding arbitration under the rules of an agreed arbitral body before either Party may initiate litigation.",
  },
  {
    title: "Governing Law",
    body:
      "This Agreement is governed by the laws of India. The exclusive jurisdiction for any legal proceedings shall be the courts of Bhavnagar, Gujarat, India.",
  },
];

ndaSections = structuredClone(ndaSectionDefaults);

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function money(value) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getData() {
  const data = { ...defaults };
  new FormData(form).forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

function setForm(data) {
  Object.entries({ ...defaults, ...data }).forEach(([key, value]) => {
    const input = form.elements[key];
    if (input) input.value = value;
  });
}

function getNdaData() {
  const data = { ...ndaDefaults };
  new FormData(ndaForm).forEach((value, key) => {
    data[key] = value;
  });
  return data;
}

function setNdaForm(data) {
  Object.entries({ ...ndaDefaults, ...data }).forEach(([key, value]) => {
    const input = ndaForm.elements[key];
    if (input) input.value = value;
  });
}

function normalizeItem(item) {
  const legacyAmount = Number(item.quantity || 0) * Number(item.rate || 0);
  return {
    description: item.description || "",
    amount: Number((item.amount ?? legacyAmount) || 0),
  };
}

function renderItemsEditor() {
  itemsTable.innerHTML = items
    .map(
      (item, index) => `
        <div class="item-row">
          <label>
            Description
            <input data-item="${index}" data-field="description" type="text" value="${escapeHtml(item.description)}" />
          </label>
          <label class="amount-field">
            Amount
            <input data-item="${index}" data-field="amount" type="number" min="0" step="0.01" value="${escapeHtml(item.amount)}" />
          </label>
          <button class="remove-item" type="button" data-remove="${index}" title="Remove item" aria-label="Remove item">×</button>
        </div>
      `
    )
    .join("");
}

function renderBankDetailsEditor() {
  bankDetailsTable.innerHTML = bankDetails
    .map(
      (detail, index) => `
        <div class="bank-row">
          <label>
            Label
            <input data-bank="${index}" data-field="label" type="text" value="${escapeHtml(detail.label)}" placeholder="Bank, UPI, GST..." />
          </label>
          <label>
            Detail
            <input data-bank="${index}" data-field="value" type="text" value="${escapeHtml(detail.value)}" placeholder="Enter detail" />
          </label>
          <button class="remove-item" type="button" data-remove-bank="${index}" title="Remove bank detail" aria-label="Remove bank detail">×</button>
        </div>
      `
    )
    .join("");
}

function renderNdaSectionsEditor() {
  ndaSectionsEditor.innerHTML = ndaSections
    .map(
      (section, index) => `
        <section class="nda-section-card ${revertedNdaSections.has(index) ? "reverted" : ""}" data-nda-section-card="${index}">
          <div class="section-heading compact-heading">
            <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
            <button class="secondary-button" type="button" data-revert-nda="${index}">Revert</button>
          </div>
          <label>
            Heading
            <input data-nda-section="${index}" data-field="title" type="text" value="${escapeHtml(section.title)}" />
          </label>
          <label>
            Section Text
            <textarea data-nda-section="${index}" data-field="body" rows="5">${escapeHtml(section.body)}</textarea>
          </label>
          <label class="yellow-note-toggle">
            <input data-nda-section="${index}" data-field="noteEnabled" type="checkbox" ${section.noteEnabled ? "checked" : ""} />
            Add yellow note box for this section
          </label>
          <label class="yellow-note-field">
            Yellow Box Text
            <textarea data-nda-section="${index}" data-field="note" rows="3" placeholder="Important note, exception, or client-specific instruction">${escapeHtml(section.note || "")}</textarea>
          </label>
        </section>
      `
    )
    .join("");
}

function normalizeNdaSection(section, fallback) {
  return {
    title: section?.title || fallback.title,
    body: section?.body || fallback.body,
    noteEnabled: Boolean(section?.noteEnabled),
    note: section?.note || "",
  };
}

function migrateNdaSections(savedSections) {
  if (!Array.isArray(savedSections) || !savedSections.length) return structuredClone(ndaSectionDefaults);
  return ndaSectionDefaults.map((section, index) => normalizeNdaSection(savedSections[index], section));
}

function calculate(data) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const taxable = Math.max(subtotal, 0);
  const tax = (taxable * Number(data.taxRate || 0)) / 100;
  const total = taxable + tax;
  const advance = Number(data.advance || 0);
  const balance = Math.max(total - advance, 0);
  return { subtotal, taxable, tax, total, advance, balance };
}

function lineList(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitTextLines(value, maxChars = 62) {
  return String(value || "")
    .split("\n")
    .flatMap((line) => wrapText(line, maxChars))
    .filter((line) => line.trim());
}

function buildSections(data) {
  const totals = calculate(data);
  const clientLines = [
    data.clientName || "Client Name",
    data.clientContact && `Contact: ${data.clientContact}`,
    data.clientEmail && `Email: ${data.clientEmail}`,
    data.clientPhone && `Phone: ${data.clientPhone}`,
    data.clientAddress && `Address: ${data.clientAddress}`,
  ].filter(Boolean);
  const documentLines = [
    `${data.documentType || "Invoice"} No: ${data.billNumber || "-"}`,
    `Issue Date: ${formatDate(data.issueDate)}`,
    `Due Date: ${formatDate(data.dueDate)}`,
    data.projectTitle && `Project: ${data.projectTitle}`,
  ].filter(Boolean);
  const bankLines = bankDetails
    .map((detail) => `${detail.label || "Detail"}: ${detail.value || ""}`.trim())
    .filter((line) => !line.endsWith(":"));
  const disclosureLines = [
    data.authorizedPerson || "Authorized person",
    data.designation || "Designation",
  ].filter(Boolean);
  const signature = {
    typed: data.typedSignature || data.authorizedPerson || "",
    strokes: signatureStrokes,
  };

  const sections = [
    {
      type: "columns",
      title: "Client & Document Details",
      columns: [
        { heading: "Bill To", lines: clientLines },
        { heading: "Document", lines: documentLines },
      ],
    },
    {
      type: "list",
      title: "Scope of Work",
      lines: lineList(data.scope).length ? lineList(data.scope) : ["Scope details will appear here."],
    },
    {
      type: "budget",
      title: "Budget Details",
      rows: items.map((item) => ({
        description: item.description || "Item",
        amount: Number(item.amount || 0),
      })),
      totals,
      taxRate: Number(data.taxRate || 0),
    },
    {
      type: "columns",
      title: "Bank & Terms",
      columns: [
        { heading: "Bank Details", lines: bankLines.length ? bankLines : ["Bank details will appear here."] },
        { heading: "Terms & Notes", lines: splitTextLines(data.terms, 36) },
      ],
    },
    {
      type: "signature",
      title: "Disclosure Party",
      lines: disclosureLines,
      signature,
    },
  ];

  return sections.map((section) => ({ ...section, height: estimateSectionHeight(section) }));
}

function estimateSectionHeight(section) {
  if (section.type === "columns") {
    const maxLines = Math.max(...section.columns.map((column) => column.lines.length));
    return 34 + maxLines * 17;
  }
  if (section.type === "list") {
    return 30 + section.lines.flatMap((line) => wrapText(line, 74)).length * 17;
  }
  if (section.type === "budget") {
    const rowLines = section.rows.reduce((sum, row) => sum + Math.max(1, wrapText(row.description, 50).length), 0);
    return 58 + rowLines * 22 + 104;
  }
  if (section.type === "signature") {
    return 116;
  }
  return 70;
}

function paginateSections(sections) {
  const pageHeight = 486;
  const pages = [[]];
  let used = 0;

  sections.forEach((section) => {
    const gap = used ? 18 : 0;
    if (used && used + gap + section.height > pageHeight) {
      pages.push([section]);
      used = section.height;
    } else {
      pages[pages.length - 1].push(section);
      used += gap + section.height;
    }
  });

  return pages;
}

function renderBillPreview() {
  const data = getData();
  const pages = paginateSections(buildSections(data));
  latestPreviewPages = pages;
  currentPreviewPage = Math.min(currentPreviewPage, Math.max(pages.length - 1, 0));

  previewTitle.textContent = `${data.documentType} Preview`;

  preview.innerHTML = `
    ${pages
      .map(
        (page, index) => `
          <section class="template-page" ${index === currentPreviewPage ? "" : "hidden"}>
            <div class="template-content">
              ${page.map(renderTemplateSection).join("")}
            </div>
          </section>
        `
      )
      .join("")}
  `;

  updatePreviewPagination();
  saveState();
}

function renderPreview() {
  if (activeMode === "nda") {
    renderNdaPreview();
    return;
  }
  renderBillPreview();
}

function updatePreviewPagination() {
  const total = Math.max(latestPreviewPages.length, 1);
  const pages = preview.querySelectorAll(".template-page");
  pages.forEach((page, index) => {
    page.hidden = index !== currentPreviewPage;
  });
  pageIndicator.textContent = `Page ${currentPreviewPage + 1} of ${total}`;
  prevPageButton.disabled = currentPreviewPage <= 0;
  nextPageButton.disabled = currentPreviewPage >= total - 1;
}

function renderTemplateSection(section) {
  if (section.type === "columns") {
    return `
      <section class="template-section">
        <h3>${escapeHtml(section.title)}</h3>
        <div class="notes-grid">
          ${section.columns
            .map(
              (column) => `
                <div>
                  <strong>${escapeHtml(column.heading)}</strong>
                  <p>${column.lines.map(escapeHtml).join("<br>")}</p>
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }
  if (section.type === "list") {
    return `
      <section class="template-section">
        <h3>${escapeHtml(section.title)}</h3>
        <ul>${section.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
      </section>
    `;
  }
  if (section.type === "budget") {
    return `
      <section class="template-section">
        <h3>${escapeHtml(section.title)}</h3>
        <table class="template-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${section.rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.description)}</td>
                    <td class="num">${money(row.amount)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
        <table class="template-total">
          <tbody>
            ${previewTotalRow("Subtotal", money(section.totals.subtotal))}
            ${previewTotalRow(`Tax (${section.taxRate}%)`, money(section.totals.tax))}
            ${previewTotalRow("Total", money(section.totals.total))}
            ${previewTotalRow("Advance Paid", money(section.totals.advance))}
            ${previewTotalRow("Balance Due", money(section.totals.balance), true)}
          </tbody>
        </table>
      </section>
    `;
  }
  return `
    <section class="template-section">
      <h3>${escapeHtml(section.title)}</h3>
      <p>${section.lines.map(escapeHtml).join("<br>")}</p>
      ${renderSignaturePreview(section.signature)}
      <p style="margin-top: 8px; text-align: right;">Authorized Signature</p>
    </section>
  `;
}

function previewTotalRow(label, value, grand = false) {
  return `<tr class="${grand ? "balance-row" : ""}"><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`;
}

function signatureSvg(strokes, typed = "") {
  if (!strokes.length && !typed) return "";
  const paths = strokes
    .filter((stroke) => stroke.length > 1)
    .map((stroke) => {
      const [first, ...rest] = stroke;
      return `<path d="M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest
        .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(" ")}" />`;
    })
    .join("");
  const typedText = typed
    ? `<text x="50%" y="58%" text-anchor="middle" dominant-baseline="middle">${escapeHtml(typed)}</text>`
    : "";
  return `
    <svg viewBox="0 0 640 180" preserveAspectRatio="xMidYMid meet" aria-label="Signature">
      ${paths}
      ${typedText}
    </svg>
  `;
}

function renderSignaturePreview(signature) {
  const svg = signatureSvg(signature?.strokes || [], signature?.typed || "");
  if (!svg) return "";
  return `<div class="signature-preview">${svg}</div>`;
}

function renderNdaPreview() {
  const data = getNdaData();
  const pageModels = buildNdaPageModels(data);
  const pages = buildNdaPages(data, pageModels);

  latestPreviewPages = pages;
  currentPreviewPage = Math.min(currentPreviewPage, pages.length - 1);
  previewTitle.textContent = "NDA Preview";
  preview.innerHTML = pages
    .map(
      (page, index) => `
        <section class="template-page" ${index === currentPreviewPage ? "" : "hidden"}>
          <div class="nda-clean-layer">
            ${page}
          </div>
        </section>
      `
    )
    .join("");
  updatePreviewPagination();
  saveNdaState();
}

function buildNdaPageModels(data) {
  const contentLimit = 64;
  const firstPage = { first: true, sectionIndexes: [], paymentIntro: false, signature: false };
  const pages = [firstPage];
  const firstPageUsed =
    estimateNdaTopMatterHeight(data) +
    estimateNdaSectionHeight(0) +
    estimateNdaProjectLineHeight(data.projectService) +
    estimateNdaSectionHeight(1);

  let current = firstPage;
  let used = firstPageUsed;

  function startPage(extra = {}) {
    current = { first: false, sectionIndexes: [], paymentIntro: false, signature: false, ...extra };
    pages.push(current);
    used = extra.paymentIntro ? estimateNdaPaymentIntroHeight(data) : 0;
  }

  for (let index = 2; index < ndaSections.length; index += 1) {
    if (index === 9 && used > 0) startPage({ paymentIntro: true });
    else if (index === 9) {
      current.paymentIntro = true;
      used += estimateNdaPaymentIntroHeight(data);
    }

    const sectionHeight = estimateNdaSectionHeight(index);
    const gap = current.sectionIndexes.length || current.paymentIntro ? 2 : 0;
    if (used && used + gap + sectionHeight > contentLimit) {
      startPage({ paymentIntro: index === 9 });
    }
    current.sectionIndexes.push(index);
    used += (current.sectionIndexes.length > 1 ? 2 : 0) + sectionHeight;
  }

  const signatureHeight = 10;
  if (used + signatureHeight > contentLimit) startPage();
  current.signature = true;
  return pages;
}

function estimateNdaTopMatterHeight(data) {
  const clientLines = Math.max(
    3,
    wrapText(data.clientName || "Client Name", 44).length +
      wrapText(data.clientEmail || "-", 44).length +
      wrapText(data.clientWebsite || "-", 44).length
  );
  return 27 + clientLines * 2.4;
}

function estimateNdaProjectLineHeight(value) {
  return 2.8 + wrapText(`Project / Service: ${value || "-"}`, 92).length * 1.7;
}

function estimateNdaPaymentIntroHeight(data) {
  const notes = wrapText(`Payment Notes: ${data.paymentNotes || "-"}`, 92).length;
  return 16 + notes * 1.7;
}

function estimateNdaSectionHeight(index) {
  const section = ndaSections[index] || ndaSectionDefaults[index];
  const bodyLines = parseNdaLines(section.body).reduce((sum, line) => {
    if (line.type === "space") return sum + 0.7;
    return sum + Math.max(1, wrapText(line.text, line.type === "bullet" ? 88 : 92).length);
  }, 0);
  const noteLines =
    section.noteEnabled && section.note ? Math.max(1, splitTextLines(section.note, 88).length) : 0;
  return 3.5 + bodyLines * 1.65 + (noteLines ? 2.8 + noteLines * 1.55 : 0);
}

function renderNdaPaymentIntro(data) {
  return `
    <h3 class="nda-part-title">PART B - PAYMENT TERMS AGREEMENT</h3>
    <table class="nda-fee-table">
      <tr><th>Fee Type</th><th>Rate / Amount</th><th>Notes</th></tr>
      <tr><td>Fixed Project Fee</td><td>${escapeHtml(data.fixedFee || "-")}</td><td>Defined scope per SOW</td></tr>
      <tr><td>Hourly Rate</td><td>${escapeHtml(data.hourlyRate || "-")}</td><td>Billed with time logs</td></tr>
      <tr><td>Retainer</td><td>${escapeHtml(data.retainer || "-")}</td><td>Reserved capacity</td></tr>
    </table>
    <div class="nda-project-line"><strong>Payment Notes:</strong> ${escapeHtml(data.paymentNotes || "-")}</div>
  `;
}

function renderNdaSignatureBlock(data) {
  return `
    <div class="nda-signature-grid">
      <div>
        <p class="signature-text">${escapeHtml(data.providerSignature || data.providerSignatory || "Cyphrix Technologies")}</p>
        <strong>${escapeHtml(data.providerSignatory || "Cyphrix Technologies")}</strong>
        <span>Service Provider</span>
        <span>Date: ${escapeHtml(formatDate(data.effectiveDate))}</span>
      </div>
      <div>
        <div class="client-signature-box" aria-label="Client signature box"></div>
        <strong>${escapeHtml(data.clientSignatory || data.clientName || "Client")}</strong>
        <span>Receiving Party</span>
        <span>Date: ${escapeHtml(formatDate(data.effectiveDate))}</span>
      </div>
    </div>
  `;
}

function buildNdaPages(data, pageModels = buildNdaPageModels(data)) {
  return pageModels.map((page) => {
    const sectionsHtml = page.sectionIndexes.map((sectionIndex) => renderNdaSectionForPreview(sectionIndex)).join("");
    if (page.first) {
      return `
        <header class="nda-document-head">
          <h2>NON-DISCLOSURE & PAYMENT TERMS AGREEMENT</h2>
          <p>Cyphrix Technologies — Trust. Encrypted.</p>
        </header>
        <div class="nda-meta-row">
          <span><strong>Effective Date:</strong> ${escapeHtml(formatDate(data.effectiveDate))}</span>
          <span><strong>Doc Ref:</strong> ${escapeHtml(data.docRef)}</span>
        </div>
        <div class="nda-party-table">
          <div class="party-heading">Service Provider</div>
          <div class="party-heading">Client (Receiving Party)</div>
          <div>
            <strong>Cyphrix Technologies</strong>
            <span>Email: cyphrixsupport@cyphrixtech.com</span>
            <span>Web: https://cyphrixtech.com/</span>
          </div>
          <div>
            <span><strong>Name / Company:</strong> ${escapeHtml(data.clientName || "Client Name")}</span>
            <span><strong>Email:</strong> ${escapeHtml(data.clientEmail || "-")}</span>
            <span><strong>Website:</strong> ${escapeHtml(data.clientWebsite || "-")}</span>
          </div>
        </div>
        <p class="nda-intro">Cyphrix Technologies ("Service Provider") and the Client are collectively the <strong>"Parties."</strong> This Agreement formalises Cyphrix Technologies' commitment to <em>Trust. Encrypted.</em></p>
        <h3 class="nda-part-title">PART A - NON-DISCLOSURE AGREEMENT</h3>
        ${renderNdaSectionForPreview(0)}
        <div class="nda-project-line"><strong>Project / Service:</strong> ${escapeHtml(data.projectService || "-")}</div>
        ${renderNdaSectionForPreview(1)}
        ${sectionsHtml}
        ${page.signature ? renderNdaSignatureBlock(data) : ""}
      `;
    }
    return `
      ${page.paymentIntro ? renderNdaPaymentIntro(data) : ""}
      ${sectionsHtml}
      ${page.signature ? renderNdaSignatureBlock(data) : ""}
    `;
  });
}

function renderNdaSectionForPreview(index) {
  const section = ndaSections[index] || ndaSectionDefaults[index];
  return `
    <section class="nda-generated-section">
      <h4><span>${index + 1}</span>${escapeHtml(section.title)}</h4>
      ${renderRichNdaText(section.body)}
      ${section.noteEnabled && section.note ? `<div class="nda-yellow-note">${renderRichNdaText(section.note)}</div>` : ""}
    </section>
  `;
}

function parseNdaLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const bullet = /^[-*•]\s+(.+)/.exec(trimmed);
      return { type: bullet ? "bullet" : trimmed ? "text" : "space", text: bullet ? bullet[1] : trimmed };
    });
}

function renderRichNdaText(value) {
  const lines = parseNdaLines(value);
  let html = "";
  let bulletItems = [];

  function flushBullets() {
    if (!bulletItems.length) return;
    html += `<ul>${bulletItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    bulletItems = [];
  }

  lines.forEach((line) => {
    if (line.type === "bullet") {
      bulletItems.push(line.text);
      return;
    }
    flushBullets();
    if (line.type === "space") {
      html += `<div class="nda-line-space"></div>`;
    } else {
      html += `<p>${escapeHtml(line.text)}</p>`;
    }
  });
  flushBullets();
  return html;
}

function saveState() {
  const data = getData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, items, bankDetails, signatureStrokes }));
}

function saveNdaState() {
  localStorage.setItem(NDA_STORAGE_KEY, JSON.stringify({ data: getNdaData(), sections: ndaSections, contentVersion: NDA_CONTENT_VERSION }));
}

function loadNdaState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NDA_STORAGE_KEY) || "{}");
    setNdaForm(parsed.data || ndaDefaults);
    ndaSections = parsed.contentVersion === NDA_CONTENT_VERSION ? migrateNdaSections(parsed.sections) : structuredClone(ndaSectionDefaults);
  } catch {
    setNdaForm(ndaDefaults);
    ndaSections = structuredClone(ndaSectionDefaults);
  }
}

function getDrafts() {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

function draftLabel(data) {
  const client = data.clientName?.trim() || "Untitled client";
  const number = data.billNumber?.trim() || "No number";
  return `${number} - ${client}`;
}

function renderDraftOptions(selectedId = "") {
  const drafts = activeMode === "nda" ? getNdaDrafts() : getDrafts();
  draftSelect.innerHTML = drafts.length
    ? `<option value="">Select saved draft</option>${drafts
        .map(
          (draft) =>
            `<option value="${escapeHtml(draft.id)}" ${draft.id === selectedId ? "selected" : ""}>${escapeHtml(draft.label)}</option>`
        )
        .join("")}`
    : `<option value="">No saved drafts</option>`;
  loadDraftButton.disabled = !drafts.length || !selectedId;
}

function setSaveStatus(message) {
  saveStatus.textContent = message;
  if (!message) return;
  window.clearTimeout(setSaveStatus.timer);
  setSaveStatus.timer = window.setTimeout(() => {
    saveStatus.textContent = "";
  }, 3500);
}

function saveBillDraft() {
  const data = getData();
  const id = data.billNumber?.trim() || `draft-${Date.now()}`;
  const drafts = getDrafts();
  const existingIndex = drafts.findIndex((draft) => draft.id === id);
  const draft = {
    id,
    label: draftLabel(data),
    updatedAt: new Date().toISOString(),
    data,
    items: structuredClone(items),
    bankDetails: structuredClone(bankDetails),
    signatureStrokes: structuredClone(signatureStrokes),
  };

  if (existingIndex >= 0) drafts[existingIndex] = draft;
  else drafts.unshift(draft);

  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 30)));
  renderDraftOptions(id);
  setSaveStatus(`Saved ${draft.label}`);
}

function saveNdaDraft() {
  const data = getNdaData();
  const id = data.docRef?.trim() || `nda-${Date.now()}`;
  const drafts = getNdaDrafts();
  const existingIndex = drafts.findIndex((draft) => draft.id === id);
  const draft = {
    id,
    label: `${id} - ${data.clientName || "Untitled client"}`,
    updatedAt: new Date().toISOString(),
    data,
    sections: structuredClone(ndaSections),
  };
  if (existingIndex >= 0) drafts[existingIndex] = draft;
  else drafts.unshift(draft);
  localStorage.setItem(NDA_DRAFTS_KEY, JSON.stringify(drafts.slice(0, 30)));
  renderDraftOptions(id);
  setSaveStatus(`Saved ${draft.label}`);
}

function saveDraft() {
  if (activeMode === "nda") saveNdaDraft();
  else saveBillDraft();
}

function getNdaDrafts() {
  try {
    const drafts = JSON.parse(localStorage.getItem(NDA_DRAFTS_KEY) || "[]");
    return Array.isArray(drafts) ? drafts : [];
  } catch {
    return [];
  }
}

function loadSelectedDraft() {
  const id = draftSelect.value;
  if (activeMode === "nda") {
    const draft = getNdaDrafts().find((entry) => entry.id === id);
    if (!draft) {
      setSaveStatus("Choose a saved NDA draft first.");
      return;
    }
    setNdaForm(draft.data || ndaDefaults);
    ndaSections = migrateNdaSections(draft.sections);
    revertedNdaSections.clear();
    renderNdaSectionsEditor();
    currentPreviewPage = 0;
    renderPreview();
    renderDraftOptions(id);
    setSaveStatus(`Loaded ${draft.label}`);
    return;
  }
  const draft = getDrafts().find((entry) => entry.id === id);
  if (!draft) {
    setSaveStatus("Choose a saved draft first.");
    return;
  }
  setForm(draft.data || defaults);
  items = migrateItems(draft.items);
  bankDetails = migrateBankDetails(draft.data, draft.bankDetails);
  signatureStrokes = Array.isArray(draft.signatureStrokes) ? structuredClone(draft.signatureStrokes) : [];
  currentPreviewPage = 0;
  renderItemsEditor();
  renderBankDetailsEditor();
  drawSignatureCanvas();
  renderPreview();
  renderDraftOptions(id);
  setSaveStatus(`Loaded ${draft.label}`);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    setForm(defaults);
    return;
  }
  try {
    const parsed = JSON.parse(saved);
    if (parsed.data?.projectTitle === "Custom software and digital services") {
      parsed.data.projectTitle = "";
    }
    setForm(parsed.data || defaults);
    items = migrateItems(parsed.items);
    bankDetails = migrateBankDetails(parsed.data, parsed.bankDetails);
    signatureStrokes = Array.isArray(parsed.signatureStrokes) ? parsed.signatureStrokes : [];
  } catch {
    setForm(defaults);
  }
}

function switchMode(mode) {
  activeMode = mode;
  currentPreviewPage = 0;
  billModeButton.classList.toggle("active", mode === "bill");
  ndaModeButton.classList.toggle("active", mode === "nda");
  form.hidden = mode !== "bill";
  ndaForm.hidden = mode !== "nda";
  saveDraftButton.textContent = mode === "nda" ? "Save NDA" : "Save Draft";
  downloadButton.textContent = mode === "nda" ? "Download NDA PDF" : "Download PDF";
  renderDraftOptions();
  renderPreview();
}

function migrateItems(savedItems) {
  const source = Array.isArray(savedItems) && savedItems.length ? savedItems : items;
  return source.map(normalizeItem);
}

function migrateBankDetails(data = {}, savedDetails) {
  if (Array.isArray(savedDetails) && savedDetails.length) {
    return savedDetails.map((detail) => ({ label: detail.label || "", value: detail.value || "" }));
  }
  return [
    { label: "Bank", value: data?.bankName || "" },
    { label: "Account Holder", value: data?.accountHolder || "" },
    { label: "Account No", value: data?.accountNumber || "" },
    { label: "IFSC / Routing", value: data?.ifsc || "" },
  ];
}

function wrapText(text, maxChars) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function signaturePoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  const point = event.touches?.[0] || event;
  return {
    x: ((point.clientX - rect.left) / rect.width) * signatureCanvas.width,
    y: ((point.clientY - rect.top) / rect.height) * signatureCanvas.height,
  };
}

function drawSignatureCanvas() {
  if (!signatureCanvas) return;
  const context = signatureCanvas.getContext("2d");
  context.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  context.strokeStyle = "#101828";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.fillStyle = "#98a2b3";
  context.font = "13px system-ui, sans-serif";
  context.fillText("Draw signature here", 18, 28);

  signatureStrokes.forEach((stroke) => {
    if (stroke.length < 2) return;
    context.beginPath();
    context.moveTo(stroke[0].x, stroke[0].y);
    stroke.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
  });
}

function startSignature(event) {
  event.preventDefault();
  activeSignatureStroke = [signaturePoint(event)];
  signatureStrokes.push(activeSignatureStroke);
  drawSignatureCanvas();
}

function moveSignature(event) {
  if (!activeSignatureStroke) return;
  event.preventDefault();
  activeSignatureStroke.push(signaturePoint(event));
  drawSignatureCanvas();
  renderPreview();
}

function endSignature() {
  if (!activeSignatureStroke) return;
  activeSignatureStroke = null;
  renderPreview();
}

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

async function createBillPdf() {
  const data = getData();
  const pages = paginateSections(buildSections(data));
  const templateBytes = new Uint8Array(await (await fetch("assets/cyphrix-template.jpg")).arrayBuffer());
  const pageWidth = 612.24;
  const pageHeight = 957.6;
  const contentLeft = 82;
  const contentRight = 530;
  const contentTop = 656;
  const lineHeight = 13.5;

  function pageContent(sections) {
    const content = [`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`];
    let y = contentTop;

    function text(x, currentY, size, value, options = {}) {
      const color = options.color || "0.13 0.15 0.20";
      const font = options.bold ? "/F2" : "/F1";
      content.push(`BT ${color} rg ${font} ${size} Tf ${x} ${currentY} Td (${pdfEscape(value)}) Tj ET`);
    }

    function line(x1, y1, x2, y2, color = "0.72 0.78 0.84", width = 0.7) {
      content.push(`${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
    }

    function fillRect(x, currentY, w, h, color) {
      content.push(`${color} rg ${x} ${currentY} ${w} ${h} re f`);
    }

    function sectionTitle(title) {
      text(contentLeft, y, 10, title.toUpperCase(), { bold: true, color: "0.02 0.49 0.70" });
      y -= 18;
    }

    function drawLines(lines, x, maxChars, size = 9.5, prefix = "") {
      lines.forEach((lineText) => {
        wrapText(lineText, maxChars).forEach((wrapped, index) => {
          text(x + (index ? 10 : 0), y, size, `${index ? "" : prefix}${wrapped}`);
          y -= lineHeight;
        });
      });
    }

    function drawColumns(section) {
      sectionTitle(section.title);
      const columnWidth = 206;
      const startY = y;
      section.columns.forEach((column, index) => {
        const x = contentLeft + index * 242;
        let columnY = startY;
        text(x, columnY, 9, column.heading, { bold: true });
        columnY -= 14;
        column.lines.forEach((lineText) => {
          wrapText(lineText, 31).forEach((wrapped) => {
            text(x, columnY, 8.5, wrapped);
            columnY -= 12;
          });
        });
        line(x + columnWidth, startY + 3, x + columnWidth, Math.min(columnY + 8, startY - 32));
      });
      const maxLines = Math.max(...section.columns.map((column) => column.lines.flatMap((lineText) => wrapText(lineText, 31)).length));
      y = startY - 18 - maxLines * 12;
    }

    function drawList(section) {
      sectionTitle(section.title);
      section.lines.forEach((lineText) => {
        wrapText(lineText, 72).forEach((wrapped, index) => {
          text(contentLeft + (index ? 12 : 0), y, 9.5, `${index ? "" : "- "}${wrapped}`);
          y -= lineHeight;
        });
      });
    }

    function drawBudget(section) {
      sectionTitle(section.title);
      const amountX = 430;
      fillRect(contentLeft, y - 7, contentRight - contentLeft, 20, "0.91 0.97 0.99");
      text(contentLeft + 6, y, 8.5, "DESCRIPTION", { bold: true });
      text(amountX, y, 8.5, "AMOUNT", { bold: true });
      line(contentLeft, y - 9, contentRight, y - 9);
      y -= 22;
      section.rows.forEach((row) => {
        const descriptionLines = wrapText(row.description, 54);
        const rowStart = y;
        descriptionLines.forEach((lineText, index) => text(contentLeft + 6, rowStart - index * 11.5, 8.8, lineText));
        text(amountX, rowStart, 8.8, money(row.amount), { bold: true });
        y -= Math.max(1, descriptionLines.length) * 12 + 5;
        line(contentLeft, y + 3, contentRight, y + 3);
      });

      y -= 8;
      const totalRows = [
        ["Subtotal", money(section.totals.subtotal)],
        [`Tax (${section.taxRate}%)`, money(section.totals.tax)],
        ["Total", money(section.totals.total)],
        ["Advance Paid", money(section.totals.advance)],
      ];
      totalRows.forEach(([label, value]) => {
        text(364, y, 8.7, label);
        text(450, y, 8.7, value, { bold: true });
        y -= 13;
      });
      fillRect(352, y - 7, 178, 20, "0.13 0.15 0.20");
      text(364, y, 9.5, "Balance Due", { color: "1 1 1", bold: true });
      text(450, y, 9.5, money(section.totals.balance), { color: "1 1 1", bold: true });
      y -= 28;
    }

    function drawSignature(section) {
      sectionTitle(section.title);
      drawLines(section.lines, contentLeft, 68, 9.5);
      const boxX = 360;
      const boxY = y - 18;
      const boxW = 170;
      const boxH = 48;
      if (section.signature?.typed) {
        text(boxX + 34, boxY + 19, 13, section.signature.typed, { bold: true });
      }
      (section.signature?.strokes || []).forEach((stroke) => {
        if (stroke.length < 2) return;
        content.push("0.06 0.07 0.09 RG 1.4 w");
        const [first, ...rest] = stroke;
        const startX = boxX + (first.x / 640) * boxW;
        const startY = boxY + boxH - (first.y / 180) * boxH;
        content.push(`${startX.toFixed(2)} ${startY.toFixed(2)} m`);
        rest.forEach((point) => {
          const px = boxX + (point.x / 640) * boxW;
          const py = boxY + boxH - (point.y / 180) * boxH;
          content.push(`${px.toFixed(2)} ${py.toFixed(2)} l`);
        });
        content.push("S");
      });
      line(boxX, boxY, contentRight, boxY, "0.45 0.50 0.58");
      text(402, boxY - 14, 8.5, "Authorized Signature");
      y -= 62;
    }

    sections.forEach((section, index) => {
      if (index) y -= 16;
      if (section.type === "columns") drawColumns(section);
      else if (section.type === "list") drawList(section);
      else if (section.type === "budget") drawBudget(section);
      else drawSignature(section);
    });

    return content.join("\n");
  }

  const contentStreams = pages.map(pageContent);
  const pageRefs = contentStreams.map((_, index) => 7 + index * 2);
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteLength = 0;

  function appendString(value) {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  }

  function appendBytes(bytes) {
    chunks.push(bytes);
    byteLength += bytes.length;
  }

  function startObject(index) {
    offsets[index] = byteLength;
    appendString(`${index} 0 obj\n`);
  }

  function writeObject(index, body) {
    startObject(index);
    appendString(`${body}\nendobj\n`);
  }

  appendString("%PDF-1.4\n");
  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  writeObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  writeObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  startObject(5);
  appendString(`<< /Type /XObject /Subtype /Image /Width 1225 /Height 1916 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${templateBytes.length} >>\nstream\n`);
  appendBytes(templateBytes);
  appendString("\nendstream\nendobj\n");

  contentStreams.forEach((stream, index) => {
    const streamRef = 6 + index * 2;
    const pageRef = 7 + index * 2;
    const streamBytes = encoder.encode(stream);
    startObject(streamRef);
    appendString(`<< /Length ${streamBytes.length} >>\nstream\n`);
    appendBytes(streamBytes);
    appendString("\nendstream\nendobj\n");
    writeObject(
      pageRef,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamRef} 0 R >>`
    );
  });

  const objectCount = 5 + contentStreams.length * 2;
  const xref = byteLength;
  appendString(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objectCount; index += 1) {
    appendString(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  appendString(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

async function createNdaPdf() {
  const data = getNdaData();
  const pageWidth = 612.24;
  const pageHeight = 957.6;
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteLength = 0;

  const ndaPageModels = buildNdaPageModels(data);
  const pageCount = ndaPageModels.length;
  const imageBytes = [];
  for (let i = 0; i < pageCount; i += 1) {
    imageBytes.push(new Uint8Array(await (await fetch("assets/cyphrix-template.jpg")).arrayBuffer()));
  }

  function appendString(value) {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  }
  function appendBytes(bytes) {
    chunks.push(bytes);
    byteLength += bytes.length;
  }
  function startObject(index) {
    offsets[index] = byteLength;
    appendString(`${index} 0 obj\n`);
  }
  function writeObject(index, body) {
    startObject(index);
    appendString(`${body}\nendobj\n`);
  }
  function pdfText(content, x, y, size = 8.6, bold = false) {
    return `BT 0.07 0.09 0.13 rg ${bold ? "/F2" : "/F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(content)}) Tj ET`;
  }
  function textBlock(value, x, y, maxChars, size = 8.4) {
    return splitTextLines(value, maxChars)
      .slice(0, 8)
      .map((line, index) => pdfText(line, x, y - index * (size + 3), size))
      .join("\n");
  }

  function estimatePdfTextHeight(value, maxChars = 82, size = 8.1) {
    return parseNdaLines(value).reduce((height, entry) => {
      if (entry.type === "space") return height + size * 0.7;
      return height + Math.max(1, wrapText(entry.text, entry.type === "bullet" ? maxChars - 4 : maxChars).length) * (size + 3.2);
    }, 0);
  }

  function fillRect(x, y, w, h, color = "1 1 1") {
    return `${color} rg ${x} ${y} ${w} ${h} re f`;
  }
  function strokeRect(x, y, w, h, color = "0.70 0.78 0.85", width = 0.7) {
    return `${color} RG ${width} w ${x} ${y} ${w} ${h} re S`;
  }

  function buildNdaPdfContent(pageIndex) {
    const pageModel = ndaPageModels[pageIndex];
    const content = [`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im${pageIndex} Do Q`];
    let y = 645;

    function addText(value, x, size = 8.2, bold = false, maxChars = 82) {
      parseNdaLines(value).forEach((entry) => {
        if (entry.type === "space") {
          y -= size * 0.7;
          return;
        }
        const isBullet = entry.type === "bullet";
        wrapText(entry.text, isBullet ? maxChars - 4 : maxChars).forEach((line, lineIndex) => {
          const lineX = x + (isBullet ? 12 : 0) + (lineIndex ? 8 : 0);
          if (isBullet && lineIndex === 0) content.push(pdfText("-", x + 3, y, size, bold));
          content.push(pdfText(line, lineX, y, size, bold));
          y -= size + 3.2;
        });
      });
    }

    function addSection(sectionIndex) {
      const section = ndaSections[sectionIndex] || ndaSectionDefaults[sectionIndex];
      y -= 7;
      content.push(fillRect(82, y - 7, 448, 18, "0.86 0.96 0.98"));
      content.push(fillRect(82, y - 7, 4, 18, "0.06 0.72 0.93"));
      content.push(fillRect(92, y - 5, 16, 16, "0.06 0.56 0.82"));
      content.push(pdfText(String(sectionIndex + 1), 97, y, 7.4, true));
      content.push(pdfText(section.title.toUpperCase(), 116, y, 8.1, true));
      y -= 18;
      addText(section.body, 82, 8.1, false, 82);
      if (section.noteEnabled && section.note) {
        y -= 4;
        const noteHeight = Math.max(20, estimatePdfTextHeight(section.note, 80, 7.6) + 11);
        content.push(fillRect(82, y - noteHeight + 5, 448, noteHeight, "1 0.96 0.78"));
        content.push(fillRect(82, y - noteHeight + 5, 4, noteHeight, "0.95 0.68 0.08"));
        const originalY = y;
        y -= 8;
        addText(section.note, 92, 7.6, false, 80);
        y = Math.min(y, originalY - noteHeight - 2);
      }
    }

    if (pageModel.first) {
      content.push("0.03 0.66 0.86 rg");
      content.push(pdfText("NON-DISCLOSURE & PAYMENT TERMS AGREEMENT", 155, y, 12.5, true).replace("0.07 0.09 0.13 rg", "0.02 0.63 0.84 rg"));
      y -= 11;
      content.push(pdfText("Cyphrix Technologies - Trust. Encrypted.", 232, y, 6.8));
      y -= 23;
      content.push("0.75 0.84 0.90 RG 0.7 w 82 683 m 530 683 l S");
      content.push(pdfText(`Effective Date: ${formatDate(data.effectiveDate)}`, 82, y, 7.5, true));
      content.push(pdfText(`Doc Ref: ${data.docRef}`, 330, y, 7.5, true));
      y -= 23;
      content.push(fillRect(82, y - 7, 448, 26, "0.11 0.26 0.46"));
      content.push(pdfText("SERVICE PROVIDER", 160, y + 2, 7.4, true).replace("0.07 0.09 0.13 rg", "1 1 1 rg"));
      content.push(pdfText("CLIENT (RECEIVING PARTY)", 362, y + 2, 7.4, true).replace("0.07 0.09 0.13 rg", "1 1 1 rg"));
      y -= 26;
      content.push(fillRect(82, y - 42, 448, 45, "0.88 0.97 0.99"));
      content.push(strokeRect(82, y - 42, 448, 71));
      content.push("0.70 0.78 0.85 RG 0.7 w 306 615 m 306 544 l S");
      content.push(pdfText("Cyphrix Technologies", 92, y - 8, 7.4, true));
      content.push(pdfText("Email: cyphrixsupport@cyphrixtech.com", 92, y - 22, 7.1));
      content.push(pdfText("Web: https://cyphrixtech.com/", 92, y - 35, 7.1));
      content.push(pdfText(`Name / Company: ${data.clientName || "Client Name"}`, 316, y - 8, 7.1));
      content.push(pdfText(`Email: ${data.clientEmail || "-"}`, 316, y - 22, 7.1));
      content.push(pdfText(`Website: ${data.clientWebsite || "-"}`, 316, y - 35, 7.1));
      y -= 58;
      addText(`Cyphrix Technologies ("Service Provider") and the Client are collectively the "Parties." This Agreement formalises Cyphrix Technologies' commitment to Trust. Encrypted.`, 82, 6.7, false, 108);
      y -= 6;
      content.push(fillRect(82, y - 8, 448, 20, "0.11 0.26 0.46"));
      content.push(pdfText("PART A - NON-DISCLOSURE AGREEMENT", 236, y - 1, 8, true).replace("0.07 0.09 0.13 rg", "1 1 1 rg"));
      y -= 18;
    }

    if (pageModel.paymentIntro) {
      content.push(pdfText("PART B - PAYMENT TERMS AGREEMENT", 82, y, 8.2, true));
      y -= 18;
      content.push(pdfText("Fee Type", 88, y, 7.5, true));
      content.push(pdfText("Rate / Amount", 240, y, 7.5, true));
      content.push(pdfText("Notes", 370, y, 7.5, true));
      y -= 13;
      [
        ["Fixed Project Fee", data.fixedFee || "-", "Defined scope per SOW"],
        ["Hourly Rate", data.hourlyRate || "-", "Billed with time logs"],
        ["Retainer", data.retainer || "-", "Reserved capacity"],
      ].forEach((row) => {
        content.push(pdfText(row[0], 88, y, 7.2));
        content.push(pdfText(row[1], 240, y, 7.2, true));
        content.push(pdfText(row[2], 370, y, 7.2));
        y -= 12;
      });
      y -= 4;
      addText(`Payment Notes: ${data.paymentNotes || "-"}`, 82, 8.1, false, 86);
    }

    if (pageModel.first) {
      addSection(0);
      y -= 4;
      addText(`Project / Service: ${data.projectService || "-"}`, 82, 8.1, true, 86);
      addSection(1);
    }
    pageModel.sectionIndexes.forEach(addSection);

    if (pageModel.signature) {
      y = Math.min(y - 24, 330);
      content.push("0.45 0.50 0.58 RG 0.8 w 82 318 m 265 318 l S");
      content.push("0.45 0.50 0.58 RG 0.8 w 330 318 m 512 318 l S");
      content.push(pdfText(data.providerSignature || data.providerSignatory || "Cyphrix Technologies", 92, 340, 13, true));
      content.push(strokeRect(340, 330, 150, 34, "0.45 0.50 0.58", 0.9));
      content.push(pdfText("Client Signature", 383, 316, 6.8));
      content.push(pdfText(data.providerSignatory || "Cyphrix Technologies", 92, 300, 7.5, true));
      content.push(pdfText("Service Provider", 92, 289, 7));
      content.push(pdfText(`Date: ${formatDate(data.effectiveDate)}`, 92, 278, 7));
      content.push(pdfText(data.clientSignatory || data.clientName || "Client", 340, 300, 7.5, true));
      content.push(pdfText("Receiving Party", 340, 289, 7));
      content.push(pdfText(`Date: ${formatDate(data.effectiveDate)}`, 340, 278, 7));
    }

    return content.join("\n");
  }

  const pageContents = Array.from({ length: pageCount }, (_, index) => buildNdaPdfContent(index));

  const imageRefs = imageBytes.map((_, index) => 5 + index);
  const streamStart = 5 + pageCount;
  const pageStart = streamStart + pageCount;
  const pageRefs = Array.from({ length: pageCount }, (_, index) => pageStart + index);

  appendString("%PDF-1.4\n");
  writeObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  writeObject(2, `<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageCount} >>`);
  writeObject(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  writeObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  imageBytes.forEach((bytes, index) => {
    startObject(imageRefs[index]);
    appendString(`<< /Type /XObject /Subtype /Image /Width 1225 /Height 1916 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
    appendBytes(bytes);
    appendString("\nendstream\nendobj\n");
  });

  pageContents.forEach((content, index) => {
    const streamBytes = encoder.encode(content);
    startObject(streamStart + index);
    appendString(`<< /Length ${streamBytes.length} >>\nstream\n`);
    appendBytes(streamBytes);
    appendString("\nendstream\nendobj\n");
  });

  pageContents.forEach((_, index) => {
    writeObject(
      pageRefs[index],
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index} ${imageRefs[index]} 0 R >> /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamStart + index} 0 R >>`
    );
  });

  const objectCount = pageStart + pageCount - 1;
  const xref = byteLength;
  appendString(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= objectCount; index += 1) {
    appendString(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  appendString(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

async function downloadPdf() {
  const data = getData();
  downloadButton.disabled = true;
  downloadButton.textContent = "Preparing PDF";
  try {
    const blob = activeMode === "nda" ? await createNdaPdf() : await createBillPdf();
    const link = document.createElement("a");
    const ndaData = activeMode === "nda" ? getNdaData() : null;
    const fileSeed = activeMode === "nda" ? ndaData.docRef || "cyphrix-nda" : data.billNumber || "cyphrix-bill";
    const safeNumber = String(fileSeed).replace(/[^a-z0-9-]+/gi, "-");
    link.href = URL.createObjectURL(blob);
    link.download = activeMode === "nda" ? `${safeNumber}-nda.pdf` : `${safeNumber}-${String(data.documentType || "invoice").toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = activeMode === "nda" ? "Download NDA PDF" : "Download PDF";
  }
}

itemsTable.addEventListener("input", (event) => {
  const target = event.target;
  const index = Number(target.dataset.item);
  const field = target.dataset.field;
  if (!Number.isNaN(index) && field) {
    items[index][field] = field === "description" ? target.value : Number(target.value);
    renderPreview();
  }
});

itemsTable.addEventListener("click", (event) => {
  const index = Number(event.target.dataset.remove);
  if (!Number.isNaN(index)) {
    items.splice(index, 1);
    if (!items.length) items.push({ description: "", amount: 0 });
    renderItemsEditor();
    renderPreview();
  }
});

bankDetailsTable.addEventListener("input", (event) => {
  const target = event.target;
  const index = Number(target.dataset.bank);
  const field = target.dataset.field;
  if (!Number.isNaN(index) && field) {
    bankDetails[index][field] = target.value;
    renderPreview();
  }
});

bankDetailsTable.addEventListener("click", (event) => {
  const index = Number(event.target.dataset.removeBank);
  if (!Number.isNaN(index)) {
    bankDetails.splice(index, 1);
    if (!bankDetails.length) bankDetails.push({ label: "", value: "" });
    renderBankDetailsEditor();
    renderPreview();
  }
});

addItemButton.addEventListener("click", () => {
  items.push({ description: "", amount: 0 });
  renderItemsEditor();
  renderPreview();
});

addBankDetailButton.addEventListener("click", () => {
  bankDetails.push({ label: "", value: "" });
  renderBankDetailsEditor();
  renderPreview();
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  items = [
    { description: "Website design and development", amount: 25000 },
    { description: "Domain, hosting, and deployment support", amount: 5000 },
  ];
  bankDetails = [
    { label: "Bank", value: "" },
    { label: "Account Holder", value: "" },
    { label: "Account No", value: "" },
    { label: "IFSC / Routing", value: "" },
  ];
  signatureStrokes = [];
  currentPreviewPage = 0;
  setForm(defaults);
  renderItemsEditor();
  renderBankDetailsEditor();
  drawSignatureCanvas();
  renderPreview();
  setSaveStatus("Form reset. Saved drafts are still available.");
});

form?.addEventListener("input", renderPreview);
ndaForm?.addEventListener("input", renderPreview);
ndaSectionsEditor?.addEventListener("input", (event) => {
  const target = event.target;
  const index = Number(target.dataset.ndaSection);
  const field = target.dataset.field;
  if (!Number.isNaN(index) && field) {
    ndaSections[index][field] = field === "noteEnabled" ? target.checked : target.value;
    revertedNdaSections.delete(index);
    target.closest(".nda-section-card")?.classList.remove("reverted");
    renderPreview();
  }
});
ndaSectionsEditor?.addEventListener("click", (event) => {
  const index = Number(event.target.dataset.revertNda);
  if (!Number.isNaN(index)) {
    ndaSections[index] = structuredClone(ndaSectionDefaults[index]);
    revertedNdaSections.add(index);
    renderNdaSectionsEditor();
    renderPreview();
  }
});
downloadButton?.addEventListener("click", downloadPdf);
saveDraftButton?.addEventListener("click", saveDraft);
loadDraftButton?.addEventListener("click", loadSelectedDraft);
prevPageButton?.addEventListener("click", () => {
  currentPreviewPage = Math.max(currentPreviewPage - 1, 0);
  updatePreviewPagination();
});
nextPageButton?.addEventListener("click", () => {
  currentPreviewPage = Math.min(currentPreviewPage + 1, Math.max(latestPreviewPages.length - 1, 0));
  updatePreviewPagination();
});
draftSelect?.addEventListener("change", () => {
  loadDraftButton.disabled = !draftSelect.value;
});

signatureCanvas?.addEventListener("pointerdown", startSignature);
signatureCanvas?.addEventListener("pointermove", moveSignature);
signatureCanvas?.addEventListener("pointerup", endSignature);
signatureCanvas?.addEventListener("pointerleave", endSignature);
clearSignatureButton?.addEventListener("click", () => {
  signatureStrokes = [];
  drawSignatureCanvas();
  renderPreview();
});
billModeButton?.addEventListener("click", () => switchMode("bill"));
ndaModeButton?.addEventListener("click", () => switchMode("nda"));
resetNdaButton?.addEventListener("click", () => {
  localStorage.removeItem(NDA_STORAGE_KEY);
  setNdaForm(ndaDefaults);
  ndaSections = structuredClone(ndaSectionDefaults);
  revertedNdaSections.clear();
  renderNdaSectionsEditor();
  currentPreviewPage = 0;
  renderPreview();
  setSaveStatus("NDA form reset. Saved NDA drafts are still available.");
});

loadState();
loadNdaState();
renderDraftOptions();
renderItemsEditor();
renderBankDetailsEditor();
renderNdaSectionsEditor();
drawSignatureCanvas();
switchMode("bill");

window.cyphrixBillGenerator = {
  createPdf: createBillPdf,
  createBillPdf,
  createNdaPdf,
  getData,
  getNdaData,
  calculate: () => calculate(getData()),
};
