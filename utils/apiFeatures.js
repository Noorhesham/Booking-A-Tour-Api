class APIFeatures {
  constructor(query, queryString) {
    //this is a class that recieves the query along with the query search params knows as the query string 
    //we start applying filters by taking the obj from the url turning it to a string => optimize the operators 
    //then we search our docs with that query string OBJ we return this
    //we get the sort from the url
    this.query = query;//array of all tours
    this.queryString = queryString; //the string that the client requested
  }
  filter() {
    const queryObj = { ...this.queryString }; //i take the raw object from the url
    const excludeFields = ['page', 'sort', 'limit', 'fields']; //i exclude the fields from it 
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj); //i turn it to a string to replace the $
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    this.query = this.query.find(JSON.parse(queryStr)); //back to object again to use in the query
    return this;
  }
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');

      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v ');
    }
    return this;
  }
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit; // we skip number of vals then start the next number
    //page1 1-10 no skips 0 page2 11-20 skip the page-1*limit(10) page3 skip page-1*limit(20) 21-30
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
module.exports = APIFeatures;
