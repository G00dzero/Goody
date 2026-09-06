
  # Goodys portfolio build

  This is a code bundle for Goodys portfolio build. The original project is available at https://www.figma.com/design/5UmRmLAXQ6wFaYV1wQ7QId/Goodys-portfolio-build.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Contact form setup

  The contact form posts to `/api/contact`. The API sends mail through SendGrid and stores each submission in Firebase Realtime Database under `contactMessages`.

  Configure these environment variables in the deployment provider and in a local `.env` file when running the local API:

  - `SENDGRID_API_KEY`: a SendGrid API key with Mail Send permission.
  - `MAIL_FROM`: a sender address verified in SendGrid.
  - `MAIL_TO`: the inbox that receives portfolio messages.
  - `FIREBASE_DATABASE_URL`: `https://portfoliogoody-6f75c-default-rtdb.firebaseio.com`.

  The backend uses Firebase Admin SDK, so it needs a Firebase service account. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`, or provide `FIREBASE_SERVICE_ACCOUNT_JSON`. The private key must stay in deployment environment variables and must not be committed. Each row records the sender, message, timestamp, and delivery status (`pending`, `sent`, or `failed`).

  The rules in `database.rules.json` deny public reads and writes. This is intentional: the server uses Admin SDK credentials, which bypass Realtime Database Rules. Deploy the rules from the Firebase console or with the Firebase CLI.

  Copy `.env.example` to `.env`, fill in the values, and run `npm run email-server` in a separate terminal. For Vercel, add the same variables in the project settings; `api/contact.ts` is deployed as the `/api/contact` route automatically.
  