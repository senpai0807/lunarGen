function generatePassword(length) {
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&';
    const allChars = upperChars + lowerChars + numberChars + symbolChars;
    
    let password = 
      upperChars[Math.floor(Math.random()*upperChars.length)] +
      lowerChars[Math.floor(Math.random()*lowerChars.length)] +
      numberChars[Math.floor(Math.random()*numberChars.length)] +
      symbolChars[Math.floor(Math.random()*symbolChars.length)];
    
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random()*allChars.length)];
    }
  
    password = password.split('').sort(() => Math.random() - 0.5).join('');
  
    return password;
  }
  
  module.exports = generatePassword;  