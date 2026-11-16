<div align="center">

<img src="logo-4k.png" alt="Gradebook" width="120" />

# Gradebook (Baholash jurnali)

**A real-time online gradebook for teachers: the teacher enters grades, and students see them instantly without an account.**

![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Firestore_+_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Netlify](https://img.shields.io/badge/Netlify-hosting-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)

</div>

> The app's interface is in Uzbek.

## Features

- ⚡ **Real time:** a grade entered by the teacher shows up for students within 1–2 seconds (Firestore).
- 🔐 **Teacher-only editing:** Google sign-in protected by Firestore security rules. Students can only view.
- 👥 **Groups and subjects:** each group has its own student list, lessons (with date and topic) and grades.
- 📊 **Statistics:** group average, attendance, pass rate and grade distribution.
- 🎨 **Color-coded averages:** below 3 (failing), 3–4, 4–5 and 5 each have their own color.
- 🔎 **Search and sorting:** search by name; sort by list order, alphabetically or by average grade.
- 🗂 **Two views:** cards or a table.
- 📥 **Excel export:** download a group's grades with one click.
- 🌙 **Dark mode** and a mobile-friendly layout.

Grading: `0`–`5`, plus `nb` for an absence (counted as 0). Average = sum of grades ÷ number of lessons held.

## Tech Stack

| Part | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript (no framework) |
| Database | Cloud Firestore (real time) |
| Authentication | Firebase Authentication (Google) |
| Hosting | Netlify |

## Setup

1. Create a Firebase project and enable Firestore and Google sign-in.
2. Paste the rules from `firestore-rules.txt` into Firestore → Rules and replace `YOUR_GMAIL@gmail.com` with your own Gmail address.
3. Replace the values in `firebase-config.js` with your project's config.
4. Deploy the folder to Netlify and add the site's domain to Firebase → Authentication → Authorized domains.

Full step-by-step guide: [SETUP.md](SETUP.md).

> The key in `firebase-config.js` is not a secret; it is the public config of a Firebase web app. The data is protected by the Firestore security rules.

## Project Structure

```
index.html           # page markup
app.js               # all logic: groups, grades, statistics, export
style.css            # styles and dark mode
firebase-config.js   # Firebase connection config
firestore-rules.txt  # Firestore security rules
```

---

<div align="center">

Made by **Alisher Boltaev** · [Telegram](https://t.me/Alisher_Boltaev) · [Instagram](https://www.instagram.com/alisherboltaev_/)

</div>
