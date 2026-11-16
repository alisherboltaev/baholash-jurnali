# Setup Guide

A one-time setup that takes about 15 minutes. Students open the link without an account and see a new grade within 1–2 seconds of the teacher entering it. No redeploy is needed after that.
Everything runs on free tiers (Firebase "Spark" plan + Netlify).

## Step 1. Create a Firebase project

1. Sign in to https://console.firebase.google.com with a Google account.
2. **Create a project** → name it `baholash-jurnali` → Continue.
3. Turn off Google Analytics → **Create project**.

## Step 2. Database (Firestore)

1. In the left menu: Build → Firestore Database → **Create database**.
2. Location: `eur3 (Europe)` → Next.
3. **Start in production mode** → Create.
4. Open the **Rules** tab.
5. Delete everything there and paste the contents of `firestore-rules.txt`.
6. Replace `YOUR_GMAIL@gmail.com` with your own Gmail address (you will sign in to the site with it).
7. Click **Publish**.

## Step 3. Enable Google sign-in

1. Build → Authentication → **Get started**.
2. **Sign-in method** → Google → Enable → choose a support email → Save.

## Step 4. Get the web config

1. Gear icon ⚙ (top left) → **Project settings**.
2. Under **Your apps**, click the `</>` (Web) icon.
3. Name it `jurnal` → **Register app**.
4. You will see a snippet like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza....",
     authDomain: "baholash-jurnali.firebaseapp.com",
     projectId: "baholash-jurnali",
     ...
   };
   ```

5. Copy these values into `firebase-config.js` and save it.

## Step 5. Deploy the site

1. Go to https://app.netlify.com/drop (free sign-up with Google).
2. Drag the project folder onto the page.
3. You get a link like `https://....netlify.app`. You can rename it under Site configuration → Change site name.

## Step 6. Authorize the domain in Firebase

1. Firebase → Authentication → Settings → **Authorized domains**.
2. **Add domain** → your Netlify address → Add.

## Step 7. Start using it

1. Open your site → **O'qituvchi kirishi** (Teacher sign-in) at the top → sign in with your Gmail.
2. The message "O'qituvchi rejimi yoqildi" (teacher mode on) appears.
3. Done! Share the link with your students.

## Day to day

- Open the site and sign in as a teacher once; it remembers you.
- Enter grades, and students see them instantly.
- Nothing ever needs to be redeployed.
- Students can only view grades, not change them.
- You can grade from any computer or phone.
