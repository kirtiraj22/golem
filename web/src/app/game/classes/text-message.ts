export class TextMessage {
  onComplete: any;
  text: any;

  constructor({ text, onComplete }) {
    this.text = text;
    this.onComplete = onComplete;
  }

  create() {}
  init() {}
}
