const form = document.getElementById("billForm");
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

const STORAGE_KEY = "cyphrix.bill.generator";
const DRAFTS_KEY = "cyphrix.bill.generator.drafts";

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

function renderPreview() {
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

function saveState() {
  const data = getData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, items, bankDetails, signatureStrokes }));
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
  const drafts = getDrafts();
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

function saveDraft() {
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

function loadSelectedDraft() {
  const id = draftSelect.value;
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

async function createPdf() {
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

async function downloadPdf() {
  const data = getData();
  downloadButton.disabled = true;
  downloadButton.textContent = "Preparing PDF";
  try {
    const blob = await createPdf();
    const link = document.createElement("a");
    const safeNumber = String(data.billNumber || "cyphrix-bill").replace(/[^a-z0-9-]+/gi, "-");
    link.href = URL.createObjectURL(blob);
    link.download = `${safeNumber}-${String(data.documentType || "invoice").toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = "Download PDF";
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

loadState();
renderDraftOptions();
renderItemsEditor();
renderBankDetailsEditor();
drawSignatureCanvas();
renderPreview();

window.cyphrixBillGenerator = {
  createPdf,
  getData,
  calculate: () => calculate(getData()),
};
