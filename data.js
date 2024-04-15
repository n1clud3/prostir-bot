module.exports = class Channels {
  constructor(data) {
    this.data = data;
  }

  exists(chan_id) {
    return this.data.includes(chan_id);
  }
}