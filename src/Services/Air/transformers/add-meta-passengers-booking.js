import moment from 'moment';

export default (params) => {
  params.passengers.forEach((item) => {
    const birthSSR = moment(item.birthDate.toUpperCase(), 'YYYY-MM-DD');
    const { passCountry: country,
            passNumber: num,
            firstName: first,
            lastName: last,
            gender } = item;

    const due = moment().add(12, 'month').format('DDMMMYY');
    const birth = birthSSR.format('DDMMMYY');

    if (item.ageCategory === 'CNN') {
      item.isChild = true;
      if (item.Age < 10) {
        item.ageCategory = `C0${item.Age}`;
      } else {
        item.ageCategory = `C${item.Age}`;
      }
    }

    item.ssr = {
      type: 'DOCS',
      text: `P/${country}/${num}/${country}/${birth}/${gender}/${due}/${last}/${first}`,
    };
    item.DOB = birthSSR.format('YYYY-MM-DD');
  });

  return params;
};
