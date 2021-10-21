# LEANDRO CELES<leandroceles@gmail.com>
# Curupira Tecnologia
FROM osgeo/gdal:ubuntu-full-3.3.1

#INSTALL NODE
RUN apt-get update
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_16.x  | bash -
RUN apt-get -y install nodejs

#INSTALL TIPPERCANOE
RUN apt-get -y install git-all
RUN apt-get -y install build-essential libsqlite3-dev zlib1g-dev
RUN git clone https://github.com/mapbox/tippecanoe.git /tmp/tippecanoe-src
RUN cd /tmp/tippecanoe-src && make -j && make install

#INSTALL APP
WORKDIR /app
ADD . /app
RUN npm install

#CLEAN INSTALATIONS
RUN rm -rf /tmp/tippecanoe-src \
  && apt-get -y remove --purge build-essential && apt-get -y autoremove \
  && rm -rf ~.npm
  
#START IN NEVER-END MODE
CMD tail -f /dev/null