const d = require('./coverage/coverage-summary.json');
const files = Object.entries(d).filter(([k]) => k !== 'total');
files.sort((a, b) => a[1].branches.pct - b[1].branches.pct);
files.forEach(([name, cov]) => {
  if (cov.branches.pct < 80) {
    const short = name.split('backend\\\\').pop() || name;
    console.log(cov.branches.pct.toFixed(2).padStart(6) + '% branches  ' + short + '  (' + cov.branches.covered + '/' + cov.branches.total + ')');
  }
});
console.log('Total branches:', d.total.branches.covered + '/' + d.total.branches.total, d.total.branches.pct + '%');
