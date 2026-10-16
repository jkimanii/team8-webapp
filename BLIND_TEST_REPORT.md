# Blind Test Report: StrathShop API (Group 8)

**Tester:** SafeMeds

## 1. What happened when the README was tested

**Did they succeed? Yes.** SafeMeds got it working in about 5 minutes: the pages loaded, the images showed, and everything else ran well

**Where they got stuck**

1. **Setup delayed because the latest changes had not yet been pushed to the repo.** The setup required a `.env.example` file acting as a placeholder for the real `.env` file, and the example file had not yet been pushed. However they worked it out and created the file themselves, and then everything ran.
2. **A correct response looked wrong.** They ran `http://localhost:5000/api/listings?category=counseling` and got a different response from the one they expected. The endpoint returns every listing in the counseling category. The README's example showed a single listing and did not say the real response can contain more. The API behaved correctly, but the README did not make that clear.

**What worked:** once the `.env` file existed, the API and the client ran without further trouble, and the endpoint he tried returned real data.

## 2. What I am fixing

- **Commit `.env.example`** with every variable the server reads and safe placeholder values, so the README's `cp .env.example .env` step works on a clean clone.
- **Fix the counseling example.** Add a line saying the endpoint returns every listing in the category and that the example is trimmed to one. Replace the contract's sample data with real output from a seeded database.

## 3. Honest assessment

The README did not pass the blind test on its first attempt. The other team did end up with a working system, but only after figuring out the missing `.env` step on their own, and the README alone was not enough. They also lost time over a response that was correct but looked wrong, because my example did not show the full picture. Both problems were gaps in my documentation, not mistakes on their side.
