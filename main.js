const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const chalk = require('chalk')

const mergeWise = true;
const mergeHetzner = true;

const wiseFolder = path.join(__dirname, 'wise');
const hetznerFolder = path.join(__dirname, 'hetzner');
const outputFolder = path.join(__dirname, 'sevdesk');

if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

const formatNumber = (num) => {
  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Invalid Date';
  return parsedDate.toISOString().split('T')[0];
};

const formatMonth = (date) => {
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Invalid Month';
  return parsedDate.toISOString().slice(0, 7);
};

const allData = {
  wise: [],
  hetzner: [],
};

const processFile = (filePath, done) => {
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const direction = row['Direction'];
      const name = direction === 'IN' ? row['Target name'] || row['Source name'] : row['Source name'] || row['Target name'];
      const usage = row['Reference'];
      const date = formatDate(row['Created on']);
      const amount = formatNumber(row['Source amount (after fees)']);

      const rawAmount = parseFloat(row['Source amount (after fees)']);
      const formattedAmount = formatNumber(Math.abs(rawAmount));
      const negativeAmount = formatNumber(-Math.abs(rawAmount));

      const entry = {
        name: name,
        usage: usage,
        'date of transfer': date,
        credit: direction === 'IN' ? formattedAmount : '0',
        debit: direction === 'OUT' ? negativeAmount : '0',
      };

      allData.wise.push(entry);
    })
    .on('end', done);
};

const processHetznerFile = (filePath, done) => {
  let other = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      let total = row['total'];

      if (!total || !total.startsWith('€')) {
        return;
      }

      total = total.replace('€', '').trim().replace(',', '.');
      
      const amount = parseFloat(total);
      if (isNaN(amount) || amount <= 0) return;

      const fixedAmount = amount.toFixed(2);
      const date = row['until'];

      if (!row['product'].toLowerCase().includes('server')) {
        other.push(fixedAmount);
      } else if (row['product'].toLowerCase().includes('server')) {
        let allAmount = other.reduce((sum, amount) => sum + parseFloat(amount), 0) + parseFloat(fixedAmount);
        const entry = {
          name: row['product'],
          usage: row['grouping'],
          'date of transfer': date,
          credit: '0',
          debit: (-Math.abs(allAmount)).toFixed(2),
        };
        allData.hetzner.push(entry);
        other.length = 0; 
      } else {
        console.log("stop being stupid");
      }
    })
    .on('end', () => {
      done();
    });
};

const processFilesInDirectory = (directory, processFunction, done) => {
  fs.readdir(directory, (err, files) => {
    if (err) throw err;
    const csvFiles = files.filter((file) => file.endsWith('.csv') && file !== 'example.csv');
    let completed = 0;
    if (csvFiles.length === 0) return done();
    csvFiles.forEach((file) => {
      processFunction(path.join(directory, file), () => {
        completed++;
        if (completed === csvFiles.length) {
          done();
        }
      });
    });
  });
};

const saveMergedData = (data, fileName) => {
  const csvData = parse(data, {
    fields: ['name', 'usage', 'date of transfer', 'credit', 'debit'],
  });
  fs.writeFileSync(path.join(outputFolder, fileName), csvData, 'utf8');
  console.log(chalk.green.bold("Saved: ") + chalk.cyan.bold(fileName));
};

const saveDataByDate = (data, fileNamePrefix) => {
  const groupedData = data.reduce((acc, row) => {
    const date = row['date of transfer'];
    if (!acc[date]) acc[date] = [];
    acc[date].push(row);
    return acc;
  }, {});
  Object.entries(groupedData).forEach(([date, rows]) => {
    const csvData = parse(rows, {
      fields: ['name', 'usage', 'date of transfer', 'credit', 'debit'],
    });
    const outPath = path.join(outputFolder, `${fileNamePrefix}_${date}.csv`);
    fs.writeFileSync(outPath, csvData, 'utf8');
    console.log(`Saved: ${outPath}`);
  });
};

const mergeEntries = (data, monthly = false) => {
  const mergedData = data.reduce((acc, entry) => {
    const baseKey = `${entry.name}-${entry.usage}`;
    const key = monthly
      ? `${baseKey}-${formatMonth(entry['date of transfer'])}`
      : `${baseKey}-${entry['date of transfer']}`;

    if (!acc[key]) {
      acc[key] = { ...entry };
    } else {
      acc[key].credit = (parseFloat(acc[key].credit || 0) + parseFloat(entry.credit || 0)).toFixed(2);
      acc[key].debit = (parseFloat(acc[key].debit || 0) + parseFloat(entry.debit || 0)).toFixed(2);
    }

    return acc;
  }, {});
  return Object.values(mergedData);
};

processFilesInDirectory(wiseFolder, processFile, () => {
  processFilesInDirectory(hetznerFolder, processHetznerFile, () => {
    if (mergeWise) {
      const mergedWise = mergeEntries(allData.wise);
      saveMergedData(mergedWise, 'wise_merged.csv');
    } else {
      saveDataByDate(allData.wise, 'wise');
    }

    if (mergeHetzner) {
      const mergedHetzner = mergeEntries(allData.hetzner, true);
      saveMergedData(mergedHetzner, 'hetzner_merged.csv');
    } else {
      saveDataByDate(allData.hetzner, 'hetzner');
    }
  });
});
