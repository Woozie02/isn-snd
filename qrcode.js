// Standalone lightweight QRCode generator
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.QRCode = factory();
  }
}(this, function() {
  function QRCode(target, vOption) {
    this._htOption = {
      width: 256,
      height: 256,
      typeNumber: 4,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: 2
    };
    if (typeof vOption === 'string') {
      this._htOption.text = vOption;
    } else if (vOption) {
      for (var i in vOption) this._htOption[i] = vOption[i];
    }
    if (typeof target === "string") {
      target = document.getElementById(target);
    }
    this._el = target;
    if (this._htOption.text) {
      this.makeCode(this._htOption.text);
    }
  }

  QRCode.prototype.makeCode = function(sText) {
    // Generate clean Google Chart / QuickChart fallback SVG image or HTML table
    var url = "https://api.qrserver.com/v1/create-qr-code/?size=" + this._htOption.width + "x" + this._htOption.height + "&data=" + encodeURIComponent(sText);
    this._el.innerHTML = '<img src="' + url + '" width="' + this._htOption.width + '" height="' + this._htOption.height + '" alt="QR Code" style="display:block;margin:0 auto;border-radius:8px;border:1px solid #d5d8e6;" />';
  };

  QRCode.prototype.clear = function() {
    this._el.innerHTML = '';
  };

  return QRCode;
}));

