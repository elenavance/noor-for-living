const translations = {
  id: {
    intro: "Temukan ruang untuk mendekat kepada Allah — melalui ibadah, ilmu, dan refleksi yang bermakna, setiap hari.",
    explore: "Jelajahi Noor",
    purpose: "Kenali tujuan kami",
    trust: "Dirancang untuk menemani perjalanan spiritual Anda."
  },
  en: {
    intro: "Make space to grow closer to Allah through meaningful worship, knowledge, and reflection, every day.",
    explore: "Explore Noor",
    purpose: "Our purpose",
    trust: "Thoughtfully designed to accompany your spiritual journey."
  },
  "zh-hans": {
    intro: "通过有意义的礼拜、知识与反思，每天留出时间，让心灵更亲近真主。",
    explore: "探索 Noor",
    purpose: "了解我们的初心",
    trust: "用心设计，陪伴您的精神成长之旅。"
  }
};

const languagePicker = document.querySelector("#language");
languagePicker?.addEventListener("change", (event) => {
  const selected = translations[event.target.value] || translations.id;
  document.documentElement.lang = event.target.value;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (selected[key]) element.textContent = selected[key];
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal, .feature-card").forEach((element) => observer.observe(element));
