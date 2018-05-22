import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { MatSnackBar } from '@angular/material';

const emptyClassGrid = [
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '']
];

const emptyGrid = [
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null]
];

@Component({
  selector: 'app-sudoku',
  templateUrl: './sudoku.component.html',
  styleUrls: ['./sudoku.component.css']
})
export class SudokuComponent implements OnInit {

  public loading = false;

  public grid = [];
  public gridStyle = [];

  constructor(
    private _electronService: ElectronService,
    public snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.grid       = emptyGrid.slice();
    this.gridStyle  = emptyClassGrid.slice();
  }

  ipcRendererPromise() {
    return new Promise((resolve, reject) => {
      this._electronService.ipcRenderer.once('solved', (event, arg) => {
        if (arg === 'UNSAT') {
          reject();
        } else {
          resolve (arg);
        }
      });
    });
  }

  trackByIndex(index: number, value: number) {
    return index;
  }

  valuechange(event, row: number, column: number) {
    // console.log(this.checkValidNumb(event.data, row, column));
  }

  resetBoard() {
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        this.grid[i][j] = null;
        this.gridStyle[i][j] = null;
      }
    }
  }

  async randomBoard(numbers: number) {
    if (numbers < 81) {
      this.loading = true;
      this.resetBoard();
      for (let i = 0; i < numbers; i++) {
        this.giveCell();
      }
      this._electronService.ipcRenderer.send('solveSudoku', this.grid);
      try {
        await this.ipcRendererPromise();
      } catch (error) {
        await this.randomBoard(numbers);
      }
      this.loading = false;
    }
  }

  giveCell() {
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);

    while (this.grid[row][col] !== null) {
      row = Math.floor(Math.random() * 9);
      col = Math.floor(Math.random() * 9);
    }

    let num = Math.floor(Math.random() * 9) + 1;

    let count = 0;
    while (!this.checkValid(num, row, col) && count < 9) {
      num = (num === 9) ? 1 : num + 1;
      count++;
    }

    // if it went wrong
    if (count === 9) {
      this.giveCell();
    } else {
      this.grid[row][col] = num;
      this.gridStyle[row][col] = 'bold';
    }

  }

  async solveSudoku() {
    this._electronService.ipcRenderer.send('solveSudoku', this.grid);
    this.loading = true;
    try {
      this.grid = await this.ipcRendererPromise() as any;
    } catch (error) {
      this.snackBar.open('Unsatisfiable', 'OK', {
        duration: 2000,
      });
    }
    this.loading = false;
  }

  checkValidNumb(num: any, row: number, column: number) {
    const value = this.checkValid(num, row, column);
    if (!value) {
      this.snackBar.open('Invalid number', 'OK', {
        duration: 2000,
      });
      this.gridStyle[row][column] = 'red';
    } else {
      this.gridStyle[row][column] = '';
    }
  }

  checkValid(num: any, row: number, column: number): boolean {

    let checkVertical = true;
    for (let j = 0; j < 9; j++) {
      if (j !== row) {
        const foundNumber = (this.grid[j][column] !== null) ? this.grid[j][column].valueOf() : null;
        const writtenNumber = Number(num);
        checkVertical = checkVertical && (foundNumber !== writtenNumber);
      }
    }

    let checkHorizontal = true;
    for (let i = 0; i < 9; i++) {
      if (i !== column) {
        const foundNumber = (this.grid[row][i] !== null) ? this.grid[row][i].valueOf() : null;
        const writtenNumber = Number(num);
        checkHorizontal = checkHorizontal && (foundNumber !== writtenNumber);
      }
    }

    let checkSquare = true;
    for (let i = this.getMin(row); i < this.getMax(row); i++) {
      for (let j = this.getMin(column); j < this.getMax(column); j++) {
        if (i !== row || j !== column) {
          const foundNumber = (this.grid[i][j] !== null) ? this.grid[i][j].valueOf() : null;
          const writtenNumber = Number(num);
          checkSquare = checkSquare && (foundNumber !== writtenNumber);
        }
      }
    }

    const value = (checkVertical && checkHorizontal && checkSquare);
    return value;
  }

  getMin(val) {
    if (val < 3) {
      return 0;
    } else if (val < 6) {
      return 3;
    } else {
      return 6;
    }
  }

  getMax(val) {
    if (val < 3) {
      return 3;
    } else if (val < 6) {
      return 6;
    } else {
      return 9;
    }
  }

}
