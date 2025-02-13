import { repeatedRefNameWarning, missingReferenceWarning } from "./warnings.js";
import { tableOfContent } from "../index.js";
import { tagsToRemove } from "../parseXmlJson";
import { ancestorHasTag } from "../utilityFunctions";

export const referenceStore = {};

let chapter_number = 0;
let subsubsection_count;
let fig_count;
let foot_count;
let ex_count;
let unlabeledEx = 0;

const ifIgnore = node => {
  let ifIgnore = false;
  tagsToRemove.forEach(tag => {
    if (ancestorHasTag(node, tag)) {
      ifIgnore = true;
    }
  });
  return ifIgnore;
};

export const setupReferencesJson = (node, filename) => {
  const chapterIndex = tableOfContent[filename].index;

  subsubsection_count = 0;
  foot_count = 0;
  if (chapter_number != chapterIndex.substring(0, 1)) {
    chapter_number = chapterIndex.substring(0, 1);
    fig_count = 0;
    ex_count = 0;
  }

  //Enumerate all footnotes in the subsection
  let footnotes = node.getElementsByTagName("FOOTNOTE");
  footnotes = Array.from(footnotes).filter(
    footnote => !ancestorHasTag(footnote, "SCHEME")
  );
  for (let i = 0; footnotes[i]; ++i) {
    const footnote = footnotes[i];
    footnote.footnote_count = i + 1;
  }

  const labels = node.getElementsByTagName("LABEL");

  for (let i = 0; labels[i]; i++) {
    const label = labels[i];
    const referenceName = label.getAttribute("NAME");
    const ref_type = referenceName.split(":")[0];

    if (referenceStore[referenceName]) {
      console.log(chapterIndex);
      repeatedRefNameWarning(referenceName);
      continue;
    }

    let href;
    let displayName;
    if (ref_type == "chap") {
      displayName = chapterIndex;
      href = `/sicpjs/${chapterIndex}`;
    } else if (ref_type == "sec") {
      if (ancestorHasTag(label, "SUBSUBSECTION")) {
        subsubsection_count++;
        displayName = `${chapterIndex}.${subsubsection_count}`;
        href = `/sicpjs/${chapterIndex}#subsubsection_${subsubsection_count}`;
      } else {
        displayName = chapterIndex;
        href = `/sicpjs/${chapterIndex}`;
      }
    } else if (ref_type == "fig") {
      fig_count++;
      displayName = `${chapter_number}.${fig_count}`;
      href = `/sicpjs/${chapterIndex}#fig-${displayName}`;
    } else if (ref_type == "foot") {
      // Retrieve count from the parent node, setup before this loop
      foot_count = label.parentNode.footnote_count;
      displayName = foot_count;
      href = `/sicpjs/${chapterIndex}#footnote-${foot_count}`;
    } else {
      continue;
    }

    //console.log(referenceName + " added");
    referenceStore[referenceName] = { href, displayName, chapterIndex };
  }

  // set up exercise references separately
  // account for unlabeled exercises
  const exercises = node.getElementsByTagName("EXERCISE");
  for (let i = 0; exercises[i]; i++) {
    const exercise = exercises[i];

    if (ifIgnore(exercise)) {
      continue;
    }

    const label = exercise.getElementsByTagName("LABEL")[0];
    let referenceName;
    let ref_type;
    if (!label) {
      //unlabelled exercise
      unlabeledEx++;
      referenceName = "ex:unlabeled" + unlabeledEx;
      ref_type = referenceName.split(":")[0];
    } else {
      referenceName = label.getAttribute("NAME");
      ref_type = referenceName.split(":")[0];
    }

    if (ref_type != "ex") {
      continue;
    }

    if (referenceStore[referenceName]) {
      console.log(chapterIndex);
      repeatedRefNameWarning(referenceName);
      continue;
    }

    ex_count++;
    const displayName = `${chapter_number}.${ex_count}`;
    const href = `/sicpjs/${chapterIndex}#ex-${displayName}`;
    referenceStore[referenceName] = { href, displayName, chapterIndex };
  }
};

export const processReferenceJson = (node, obj) => {
  const referenceName = node.getAttribute("NAME");
  if (!referenceStore[referenceName]) {
    missingReferenceWarning(referenceName);
    return;
  }

  const href = referenceStore[referenceName].href;
  const displayName = referenceStore[referenceName].displayName;

  obj["tag"] = "REF";
  obj["body"] = displayName;
  obj["href"] = href;
};

export default processReferenceJson;
