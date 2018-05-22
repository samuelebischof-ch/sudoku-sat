import { Component, OnInit, ViewChild } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { SudokuComponent } from './@components/sudoku/sudoku.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  public loading = false;

  constructor(private _electronService: ElectronService) {}

  @ViewChild(SudokuComponent) child: SudokuComponent;

  async ngOnInit() {
    this.installAll();
  }

  easyBtnClicked() {
    this.child.randomBoard(30);
  }

  mediumBtnClicked() {
    this.child.randomBoard(20);
  }

  hardBtnClicked() {
    this.child.randomBoard(10);
  }

  mainReadyPromise() {
    return new Promise((resolve, reject) => {
      this._electronService.ipcRenderer.once('ready', (event, arg) => {
        resolve();
      });
    });
  }

  async installAll() {
    this.loading = true;
    this._electronService.ipcRenderer.send('prepare', {});
    try {
      await this.mainReadyPromise();
    } catch (error) {}
    this.loading = false;
  }
}
