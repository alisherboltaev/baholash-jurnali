<div align="center">

<img src="logo-4k.png" alt="Baholash jurnali" width="120" />

# Baholash jurnali

**O'qituvchilar uchun onlayn baholash jurnali: o'qituvchi baho qo'yadi, o'quvchilar esa uni akkauntsiz, real vaqtda ko'radi.**

*A real-time online gradebook for teachers, built with vanilla JavaScript and Firebase.*

![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Firestore_+_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-hosting-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)

</div>

## Imkoniyatlar

- ⚡ **Real vaqt:** o'qituvchi qo'ygan baho o'quvchilarda 1–2 soniyada ko'rinadi (Firestore).
- 🔐 **Faqat o'qituvchi tahrirlaydi:** Google orqali kirish, Firestore qoidalari bilan himoyalangan. O'quvchilar faqat ko'radi.
- 👥 **Guruhlar va fanlar:** har bir guruh uchun o'quvchilar ro'yxati, darslar (sana va mavzu bilan) va baholar.
- 📊 **Statistika:** guruh o'rtachasi, davomat, fandan o'tganlar foizi, baholar taqsimoti.
- 🎨 **Rangli o'rtacha baho:** 3 dan past (o'tmadi), 3–4, 4–5 va 5 alohida ranglarda ko'rinadi.
- 🔎 **Qidiruv va tartiblash:** ism bo'yicha qidirish, ro'yxat, alifbo yoki o'rtacha baho bo'yicha tartiblash.
- 🗂 **Ikki ko'rinish:** kartochkalar yoki jadval.
- 📥 **Excel'ga eksport:** guruh baholarini bitta tugma bilan yuklab olish.
- 🌙 **Tungi rejim** va telefonga moslashgan dizayn.

Baholash: `0`–`5`, `nb` esa darsga kelmaganni bildiradi (0 deb hisoblanadi). O'rtacha baho = baholar yig'indisi ÷ o'tilgan darslar soni.

## Texnologiyalar

| Qism | Texnologiya |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (framework'siz) |
| Ma'lumotlar bazasi | Cloud Firestore (real vaqt) |
| Kirish | Firebase Authentication (Google) |
| Hosting | Netlify |

## O'rnatish

1. Firebase'da loyiha yarating, Firestore va Google orqali kirishni yoqing.
2. `firestore-qoidalari.txt` dagi qoidalarni Firestore → Rules bo'limiga qo'ying va `SIZNING_GMAIL@gmail.com` ni o'zingizning Gmail manzilingizga almashtiring.
3. `firebase-config.js` faylidagi qiymatlarni o'z loyihangiz sozlamalari bilan almashtiring.
4. Papkani Netlify'ga joylang va sayt manzilini Firebase → Authentication → Authorized domains ro'yxatiga qo'shing.

Batafsil, qadamma-qadam qo'llanma: [YORIQNOMA.txt](YORIQNOMA.txt).

> `firebase-config.js` dagi kalit maxfiy emas, u Firebase veb-ilovalarining ochiq sozlamasi. Ma'lumotlarni Firestore qoidalari himoya qiladi.

## Loyiha tuzilishi

```
index.html               # sahifa tuzilishi
app.js                   # butun mantiq: guruhlar, baholar, statistika, eksport
style.css                # dizayn va tungi rejim
firebase-config.js       # Firebase ulanish sozlamasi
firestore-qoidalari.txt  # Firestore xavfsizlik qoidalari
```

---

<div align="center">

Muallif: **Alisher Boltaev** · [Telegram](https://t.me/Alisher_Boltaev) · [Instagram](https://www.instagram.com/alisherboltaev_/)

</div>
