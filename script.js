function sonido(animal){

  let audio = new Audio(
    "sonidos/" + animal.toUpperCase() + ".mp3"
  );

  audio.play();
}