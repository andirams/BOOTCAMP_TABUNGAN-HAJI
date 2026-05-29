import { app } from './app'

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Tabungan Haji API listening on port ${port}`);
});
