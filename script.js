/* EasyBus - single JS file for all pages */

const STORAGE_KEY = "easybus_booking";

function $(id) {
  return document.getElementById(id);
}

function moneyINR(amount) {
  const n = Number(amount || 0);
  return `₹${n.toFixed(0)}`;
}

function onlyDigits(str) {
  return String(str || "").replace(/\D/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(email || "").trim());
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uuidLike() {
  // Simple readable booking id (not cryptographic)
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.floor(Math.random() * 1e6).toString(36).toUpperCase();
  return `EB-${t}-${r}`;
}

function computeFare({ baseFarePerSeat, seatCount, discountPercent }) {
  const seats = Number(seatCount || 0);
  const fare = Number(baseFarePerSeat || 0);
  const base = fare * seats;
  const discount = Math.round((base * Number(discountPercent || 0)) / 100);
  const subtotal = base - discount;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  return { base, discount, tax, total };
}

function renderReceiptHTML(booking) {
  if (!booking) return "";
  const seats = (booking.seats || []).join(", ");
  return `
    <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
      <div>
        <div><strong>Booking ID:</strong> ${booking.bookingId}</div>
        <div><strong>Name:</strong> ${booking.fullName}</div>
        <div><strong>Email:</strong> ${booking.email}</div>
        <div><strong>Phone:</strong> ${booking.phone}</div>
      </div>
      <div>
        <div><strong>Route:</strong> ${booking.from} → ${booking.to}</div>
        <div><strong>Date:</strong> ${booking.date}</div>
        <div><strong>Time:</strong> ${booking.time}</div>
        <div><strong>Payment:</strong> ${booking.payment}</div>
      </div>
    </div>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">
    <div><strong>Passengers:</strong> ${booking.passengers}</div>
    <div><strong>Seats:</strong> ${seats || "-"}</div>
    <div class="muted" style="margin-top:6px;">Base fare is per seat. Discount and 5% tax applied.</div>
    <table aria-label="Bill totals" style="margin-top:10px;">
      <tbody>
        <tr><th style="width:55%;">Base Fare</th><td>${moneyINR(booking.fare.base)}</td></tr>
        <tr><th>Discount</th><td>- ${moneyINR(booking.fare.discount)}</td></tr>
        <tr><th>Tax (5%)</th><td>${moneyINR(booking.fare.tax)}</td></tr>
        <tr><th><strong>Total Paid</strong></th><td><strong>${moneyINR(booking.fare.total)}</strong></td></tr>
      </tbody>
    </table>
  `;
}

function setMinDateIfPresent() {
  const dateEl = $("date");
  if (dateEl && dateEl.type === "date") {
    dateEl.min = todayISO();
  }
}

function initSeatGrid() {
  const seatsBox = $("seats");
  if (!seatsBox) return;

  // demo: pre-disable a few seats
  const disabledSeats = new Set([2, 7, 13, 19]);
  const totalSeats = 20;

  seatsBox.innerHTML = "";
  for (let i = 1; i <= totalSeats; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "seat";
    btn.textContent = String(i);
    btn.setAttribute("aria-label", `Seat ${i}`);

    if (disabledSeats.has(i)) {
      btn.classList.add("disabled");
      btn.disabled = true;
      btn.title = "Already booked";
    } else {
      btn.addEventListener("click", () => toggleSeat(i, btn));
    }

    seatsBox.appendChild(btn);
  }
}

function getSelectedSeats() {
  const seatsBox = $("seats");
  if (!seatsBox) return [];
  const selected = Array.from(seatsBox.querySelectorAll(".seat.selected"))
    .map((b) => Number(b.textContent))
    .sort((a, b) => a - b);
  return selected;
}

function toggleSeat(seatNo, btnEl) {
  const passengers = Number($("passengers")?.value || 1);
  const selected = getSelectedSeats();
  const isSelected = btnEl.classList.contains("selected");

  if (!isSelected && selected.length >= passengers) {
    alert(`You selected ${passengers} passenger(s). Please unselect a seat first.`);
    return;
  }

  btnEl.classList.toggle("selected");
  updateFareUI();
  updateReceiptPreview();
}

function getRouteInfo() {
  const routeEl = $("route");
  if (!routeEl) return null;
  const opt = routeEl.options[routeEl.selectedIndex];
  if (!opt || !routeEl.value) return null;
  return {
    code: routeEl.value,
    from: opt.getAttribute("data-from") || "",
    to: opt.getAttribute("data-to") || "",
    fare: Number(opt.getAttribute("data-fare") || 0),
    label: opt.textContent || "",
  };
}

function updateFareUI() {
  const breakdown = $("fareBreakdown");
  const summaryLine = $("fareSummaryLine");
  if (!summaryLine) return;

  const route = getRouteInfo();
  const discountPercent = Number($("discount")?.value || 0);
  const passengers = Number($("passengers")?.value || 1);
  const seats = getSelectedSeats();
  const seatCount = seats.length;

  if (!route) {
    summaryLine.textContent = "Choose a route and seats to calculate fare.";
    if (breakdown) breakdown.classList.add("hide");
    return;
  }

  const fare = computeFare({
    baseFarePerSeat: route.fare,
    seatCount,
    discountPercent,
  });

  summaryLine.textContent = `Selected ${seatCount}/${passengers} seat(s). Total payable: ${moneyINR(fare.total)}.`;

  const baseFareCell = $("baseFareCell");
  const discountCell = $("discountCell");
  const taxCell = $("taxCell");
  const totalCell = $("totalCell");
  if (baseFareCell) baseFareCell.textContent = moneyINR(fare.base);
  if (discountCell) discountCell.textContent = `- ${moneyINR(fare.discount)}`;
  if (taxCell) taxCell.textContent = moneyINR(fare.tax);
  if (totalCell) totalCell.innerHTML = `<strong>${moneyINR(fare.total)}</strong>`;
}

function updateReceiptPreview() {
  const receipt = $("receipt");
  if (!receipt) return;

  const route = getRouteInfo();
  const passengers = Number($("passengers")?.value || 1);
  const seats = getSelectedSeats();
  if (!route || seats.length === 0) {
    receipt.classList.add("hide");
    receipt.innerHTML = "";
    return;
  }

  const fare = computeFare({
    baseFarePerSeat: route.fare,
    seatCount: seats.length,
    discountPercent: Number($("discount")?.value || 0),
  });

  receipt.classList.remove("hide");
  receipt.innerHTML = `
    <strong>Preview</strong><br>
    Route: ${route.from} → ${route.to}<br>
    Seats: ${seats.join(", ")} (${seats.length}/${passengers})<br>
    Total payable: <strong>${moneyINR(fare.total)}</strong>
  `;
}

function toggleFareBreakdown() {
  const breakdown = $("fareBreakdown");
  const btn = $("toggleFareBtn");
  if (!breakdown || !btn) return;
  breakdown.classList.toggle("hide");
  btn.textContent = breakdown.classList.contains("hide") ? "Show Fare Breakdown" : "Hide Fare Breakdown";
}

function validateBookingForm() {
  const fullName = String($("fullName")?.value || "").trim();
  const email = String($("email")?.value || "").trim();
  const phoneDigits = onlyDigits($("phone")?.value);
  const passengers = Number($("passengers")?.value || 0);
  const route = getRouteInfo();
  const date = String($("date")?.value || "").trim();
  const time = String($("time")?.value || "").trim();
  const payment = String($("payment")?.value || "").trim();
  const seats = getSelectedSeats();

  // required
  if (!fullName || !email || !phoneDigits || !route || !date || !time || !payment) {
    alert("Please fill all required fields (*) before booking.");
    return { ok: false };
  }

  // email
  if (!isValidEmail(email)) {
    alert("Please enter a valid email address.");
    return { ok: false };
  }

  // number (phone + passengers)
  if (phoneDigits.length !== 10) {
    alert("Please enter a valid 10-digit mobile number.");
    return { ok: false };
  }
  if (!Number.isFinite(passengers) || passengers < 1 || passengers > 5) {
    alert("Passengers must be a number between 1 and 5.");
    return { ok: false };
  }

  // seats must match passengers
  if (seats.length !== passengers) {
    alert(`Please select exactly ${passengers} seat(s). Currently selected: ${seats.length}.`);
    return { ok: false };
  }

  const fare = computeFare({
    baseFarePerSeat: route.fare,
    seatCount: seats.length,
    discountPercent: Number($("discount")?.value || 0),
  });

  return {
    ok: true,
    data: {
      bookingId: uuidLike(),
      fullName,
      email,
      phone: phoneDigits,
      passengers,
      routeCode: route.code,
      from: route.from,
      to: route.to,
      date,
      time,
      payment,
      discountPercent: Number($("discount")?.value || 0),
      seats,
      baseFarePerSeat: route.fare,
      fare,
      createdAt: new Date().toISOString(),
    },
  };
}

// Called by booking.html inline handler
function bookTicket(event) {
  event.preventDefault();
  const v = validateBookingForm();
  if (!v.ok) return;

  const msg =
    `Confirm booking?\n\n` +
    `Route: ${v.data.from} → ${v.data.to}\n` +
    `Passengers: ${v.data.passengers}\n` +
    `Seats: ${v.data.seats.join(", ")}\n` +
    `Total: ${moneyINR(v.data.fare.total)}\n\n` +
    `Press OK to generate bill.`;

  if (!confirm(msg)) {
    alert("Booking cancelled.");
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(v.data));
  alert("Booking successful! Generating your bill now.");
  window.location.href = "bill.html";
}

// Called by login.html inline handler
function loginUser(event) {
  event.preventDefault();
  alert("Login successful (demo). You can now book your ticket.");
  window.location.href = "booking.html";
}

// Called by tatkal.html inline handler
function tatkalBooking(event) {
  event.preventDefault();
  const ok = confirm("Tatkal booking has extra charges. Do you want to continue?");
  if (!ok) {
    alert("Tatkal booking cancelled.");
    return;
  }
  alert("Tatkal booking confirmed (demo). Please book your ticket from the main booking page.");
  window.location.href = "booking.html";
}

function renderBillPage() {
  const billBox = $("billBox");
  if (!billBox) return;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    billBox.innerHTML = `
      <strong>No saved booking found.</strong>
      <div class="muted" style="margin-top:6px;">Go to Book Ticket to generate a new bill.</div>
    `;
    return;
  }

  let booking;
  try {
    booking = JSON.parse(raw);
  } catch {
    booking = null;
  }

  if (!booking) {
    billBox.innerHTML = `
      <strong>Saved bill data is invalid.</strong>
      <div class="muted" style="margin-top:6px;">Please book again.</div>
    `;
    return;
  }

  billBox.innerHTML = renderReceiptHTML(booking);
}

function initBookingPage() {
  if (!$("bookingForm")) return;

  setMinDateIfPresent();
  initSeatGrid();

  // hooks for dynamic updates
  $("route")?.addEventListener("change", () => {
    updateFareUI();
    updateReceiptPreview();
  });
  $("discount")?.addEventListener("change", () => {
    updateFareUI();
    updateReceiptPreview();
  });
  $("passengers")?.addEventListener("change", () => {
    // If passengers reduced, unselect extra seats
    const passengers = Number($("passengers")?.value || 1);
    const selectedBtns = Array.from($("seats")?.querySelectorAll(".seat.selected") || []);
    while (selectedBtns.length > passengers) {
      const btn = selectedBtns.pop();
      btn?.classList.remove("selected");
    }
    updateFareUI();
    updateReceiptPreview();
  });

  $("toggleFareBtn")?.addEventListener("click", toggleFareBreakdown);

  updateFareUI();
}

function initBillPage() {
  if (!$("billBox")) return;

  renderBillPage();

  $("printBtn")?.addEventListener("click", () => window.print());
  $("clearBtn")?.addEventListener("click", () => {
    const ok = confirm("Clear the saved bill data?");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    alert("Saved bill cleared.");
    renderBillPage();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initBookingPage();
  initBillPage();
});

