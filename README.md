
  # Goodys portfolio build

  This is a code bundle for Goodys portfolio build. The original project is available at https://www.figma.com/design/5UmRmLAXQ6wFaYV1wQ7QId/Goodys-portfolio-build.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Contact form setup

  The contact form posts to `/api/contact`. The API sends mail through SendGrid and stores each submission in PostgreSQL.

  Configure these environment variables in the deployment provider and in a local `.env` file when running the local API:

  - `SENDGRID_API_KEY`: a SendGrid API key with Mail Send permission.
  - `MAIL_FROM`: a sender address verified in SendGrid.
  - `MAIL_TO`: the inbox that receives portfolio messages.
  - `DATABASE_URL`: a PostgreSQL connection string.

  The `contact_messages` table is created automatically on the first request. Each row records the sender, message, timestamp, and delivery status (`pending`, `sent`, or `failed`).

  Copy `.env.example` to `.env`, fill in the values, and run `npm run email-server` in a separate terminal. For Vercel, add the same variables in the project settings; `api/contact.ts` is deployed as the `/api/contact` route automatically.
  