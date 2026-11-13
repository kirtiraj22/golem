export class KeyPressListener {
  onKeyDown: (event: any) => void;
  onKeyUp: (event: any) => void;

  constructor(keyCode, callback) {
    let keySafe = true;
    this.onKeyDown = function (event) {
      if (event.code === keyCode) {
        if (keySafe) {
          keySafe = false;
          callback();
        }
      }
    };

    this.onKeyUp = function (event) {
      if (event.code === keyCode) {
        keySafe = true;
      }
    };

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  unbind() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
