(() => {
  const search = document.getElementById("remembrance-search");
  const grid = document.getElementById("remembrance-grid");
  const count = document.getElementById("remembrance-count");
  const status = document.getElementById("remembrance-status");
  const cards = Array.from(document.querySelectorAll(".remembrance-card"));
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  let activeFilter = "all";
  function announce(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }
  function applyFilters() {
    const query = (search?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
      const matchesSearch = !query || (card.dataset.search || "").includes(query);
      const show = matchesCategory && matchesSearch;
      card.hidden = !show;
      if (show) visible++;
    });
    let empty = grid.querySelector(".remembrance-empty");
    if (!visible && !empty) {
      empty = document.createElement("p");
      empty.className = "remembrance-empty";
      empty.textContent = "No items match your search. Try another word or category.";
      grid.appendChild(empty);
    } else if (visible && empty) empty.remove();
    if (count) count.textContent = visible + (visible === 1 ? " reading" : " readings");
  }
  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter || "all";
    filters.forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applyFilters();
  }));
  search?.addEventListener("input", applyFilters);
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
    const text = button.dataset.copy || "";
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement("textarea");
        area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
        document.body.appendChild(area); area.select();
        const copied = document.execCommand("copy"); area.remove();
        if (!copied) throw new Error("Copy unavailable");
      }
      announce("Copied to clipboard.");
    } catch (_) {
      announce("Copy is not available in this browser. You can select the text manually.", true);
    }
  }));
  document.querySelectorAll("[data-counter]").forEach(counter => {
    let value = 0;
    const output = counter.querySelector("output");
    const render = () => { if (output) output.textContent = String(value); };
    counter.querySelector(".counter-plus")?.addEventListener("click", () => { value += 1; render(); });
    counter.querySelector(".counter-minus")?.addEventListener("click", () => { value = Math.max(0, value - 1); render(); });
    counter.querySelector(".counter-reset")?.addEventListener("click", () => { value = 0; render(); });
  });
  applyFilters();
})();