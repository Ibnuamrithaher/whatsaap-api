const phoneNumberFormatter = function(number) {
  //1. Mengilangkan karakter selain angka
  let formatted = number.replace(/\D/g,'');

  //2. Menghilangkan angka 0 di depan (prefix)
  // kemudian diganti dengan 62
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substr(1);
  }

  if (!formatted.endWith('@c.us')) {
    formatted += '@c.us';
  }

  return formatted;
}

module.exports = {
  phoneNumberFormatter
}