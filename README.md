# Fulcrum

TSE's internal applicant tracking system, used during recruiting. The name is a play on Lever, a widely used applicant tracking system in industry.

## Getting Started

To get started with development, clone the repository and install dependencies:

```bash
git clone https://github.com/TritonSE/TSE-Fulcrum.git
cd TSE-Fulcrum
npm install
```

Set up environment variables by creating a `.env` file in both the frontend and backend directories. Refer to the [VP Technology Playbook](https://docs.google.com/document/d/1l42jEF3dwdAbuj4iPoBCdZ3-0AGCOeL__s6r7J-kdgA/edit?usp=sharing) for the environment variables used for past deployments.

## Running Fulcrum

### Development Server

To start the development server with hot-reloading, run:

```bash
npm run dev
```

This will start the server at `http://localhost:3000`.

_Note: email sending is disabled by default in local development. They are mocked by printing to the console._

### Docker

To build and run a dockerized deployment locally, run the following commands:

```bash
docker build --build-arg VITE_APPLICATION_DEADLINE="<application deadline>" -t fulcrum
docker run -p 3000:8000 –env-file <path/to/.env> fulcrum
```

Note that the build argument `VITE_APPLICATION_DEADLINE` is needed because vite environment variables are statically injected at build time.

If you need to make your local deployment accessible to other people on the internet (useful for testing the live interview editor), you can install [Cloudflare Tunnel (cloudflared)](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/) and run:

```bash
cloudflared tunnel --url http://localhost:3000
```

This tunnels your local server to a public URL using Cloudflare's network. This does temporarily expose your machine to the internet, so use at your own risk.

## Deployment

- Database hosted on MongoDB Atlas
- Frontend bundle is generated at build time and served by the backend
- Backend hosted with DigitalOcean App Platform
  - Use [GitHub student developer pack](https://education.github.com/pack) to get free credits for hosting

## Configuration

Each year, the following environment variables need to be updated:

- `APPLICATION_DEADLINE` and `VITE_APPLICATION_DEADLINE`
- `MONGODB_URL`
- (Optional) `FIREBASE_SERVICE_ACCOUNT_KEY`

Files in `backend/src/config/` may also need to be updated if our application process changes. e.g. if we add new questions for a stage.

## Adding Users

Make sure your backend `.env` file points to the desired database you want to add users to.

```bash
cd backend
npm run sync-users <path/to/users.json>
```

If `path/to/users.json` is not provided, it defaults to `src/config/users.json`.

For the format of `users.json`, refer to the `ConfigUser` type in [`syncUsers.ts`](backend/src/scripts/syncUsers.ts)

## Hacky Database Stuff

**IMPORTANT**: always make a backup of the database (e.g. with mongodump) before doing anything.

#### Undo a rejection

Change the progress document (which is per-application, per-role) from rejected back to pending (then use the normal UI to advance it):

```js
db.progresses.updateOne(
  {
    pipeline: db.pipelines.findOne({ name: "TEST Designer" })._id,
    application: db.applications.findOne({ name: "Applicant Name" })._id,
  },
  { $set: { state: "pending" } }
);
```

#### Print graph of application count over time

mongosh one-liner (change the deadline).

```js
(() => {
  const deadline = "2022-10-09T23:59:59-0700";
  console.log("day tot new");
  const days = db.applications
    .find()
    .toArray()
    .filter((a) => true /* "designer" in a.rolePrompts */)
    .map((a) => Date.parse(deadline) - a._id.getTimestamp().getTime())
    .sort((a, b) => b - a)
    .map((t) => Math.floor(t / (24 * 60 * 60 * 1000)));
  const counts = new Map();
  days.forEach((d) => counts.set(d, (counts.get(d) ?? 0) + 1));
  let total = 0;
  for (let day = Math.max(...days); day >= Math.min(...days); day--) {
    const count = counts.get(day) ?? 0;
    total += count;
    console.log(
      `${day.toString().padStart(3)} ${total.toString().padStart(3)} ${count
        .toString()
        .padStart(3)} ${"*".repeat(count)}`
    );
  }
})();
```

The output (for 2022) looks like:

```
day tot new
 17   5   5 *****
 16  18  13 *************
 15  23   5 *****
 14  29   6 ******
 13  34   5 *****
 12  40   6 ******
 11  45   5 *****
 10  48   3 ***
  9  50   2 **
  8  56   6 ******
  7  65   9 *********
  6  77  12 ************
  5  84   7 *******
  4  98  14 **************
  3 109  11 ***********
  2 117   8 ********
  1 135  18 ******************
  0 289 154 **********************************************************************************************************************************************************
 -1 290   1 *
```

#### Print number of reviews assigned to each reviewers

Change `stageId` as necessary.

```js
db.reviews
  .find({ stageId: 10 })
  .toArray()
  .map((r) => r.reviewerEmail)
  .reduce((a, s) => ({ ...a, [s]: (a[s] || 0) + 1 }), {});
```

#### Print score distribution per question

This mongosh one-liner prints score distributions for developer phone screen questions (from Fall 2023). This can probably be reused with minor tweaks.

```js
(() => {
  const reviews = db.reviews
    .find({ stage: db.stages.findOne({ name: "Developer Phone Screen" })._id })
    .toArray()
    .filter((r) => r.completed && r.fields.behavioral_score > 0);
  const transforms = [
    [
      (f) => `conceptual ${f.grade_level} ${f.conceptual_question}`,
      (f) => f.conceptual_score,
    ],
    [
      (f) => `testing ${f.grade_level} ${f.testing_question}`,
      (f) => f.testing_score,
    ],
    [
      (f) => `problem-solving ${f.grade_level} ${f.problem_solving_question}`,
      (f) => f.problem_solving_score,
    ],
  ];
  const scores = Object.fromEntries(
    transforms.flatMap(([kf, sf]) =>
      Object.entries(
        reviews
          .map((r) => r.fields)
          .reduce(
            (o, f) => ({ ...o, [kf(f)]: [sf(f), ...(o[kf(f)] || [])].sort() }),
            {}
          )
      ).sort()
    )
  );
  Object.entries(scores)
    .map(([label, nums]) => `${label}\n${JSON.stringify(nums)}\n`)
    .forEach((l) => console.log(l));
})(); // query developer phone screen reviews and print score distributions for each question
```

#### Print aggregate responses to "How did you hear about TSE?"

Prints responses to the “How did you hear about TSE?” question on the application form, ordered from most responses to least responses.

```js
const allApplications = await ApplicationModel.find();
const hearAboutCounts: Record<string, number> = {};
for (const application of allApplications) {
  for (const elem of application.hearAboutTSE) {
    if (!hearAboutCounts[elem]) {
      hearAboutCounts[elem] = 0;
    }
    hearAboutCounts[elem]++;
  }
}

const sortedKeys = Object.keys(hearAboutCounts).sort(
  (a, b) => hearAboutCounts[b] - hearAboutCounts[a]
);
console.log("hear about counts: ");
for (const key of sortedKeys) {
  console.log(`${key}: ${hearAboutCounts[key]}`);
}
```
