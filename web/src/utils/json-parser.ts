import ChildhoodDistortions from "~/data/childhood.json";
import UniversityDistortions from "~/data/universities.json";

const distortions = [ChildhoodDistortions, UniversityDistortions];

const jsonParser = (body: string) => {
  if (body.includes("childhood")) {
    return ChildhoodDistortions;
  } else if (body.includes("university")) {
    return UniversityDistortions;
  } else {
    return distortions[Math.floor(Math.random() * distortions.length)];
  }
};

export default jsonParser;
